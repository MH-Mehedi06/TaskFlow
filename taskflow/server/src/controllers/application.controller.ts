import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import mongoose from 'mongoose';
import { Task } from '../models/Task';
import { User } from '../models/User';
import { TaskerProfile } from '../models/TaskerProfile';
import TaskApplication from '../models/TaskApplication';
import { asyncHandler } from '../utils/asyncHandler';
import { ApiError } from '../utils/ApiError';
import { ApiResponse } from '../utils/ApiResponse';
import { env } from '../config/env';
import { getUserId, getUserRole, getUserName } from '../utils/requestHelpers';
import {
  notifyNewApplication,
  notifyApplicationAccepted,
  notifyApplicationRejected,
  notifyTaskAssigned,
} from '../services/notification.service';
import { logger } from '../utils/logger';
import { populateTask } from '../utils/taskHelpers';

// POST /api/tasks/:id/apply
export const applyToTask = asyncHandler(async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) throw new ApiError(422, 'Validation failed', errors.array());

  const taskerId = getUserId(req);
  const { coverLetter, proposedRate } = req.body;

  const task = await Task.findById(req.params.id);
  if (!task) throw new ApiError(404, 'Task not found');
  if (task.status !== 'posted') throw new ApiError(400, 'This task is no longer accepting applications');
  if (String(task.clientId) === taskerId) throw new ApiError(400, 'You cannot apply to your own task');

  const existing = await TaskApplication.findOne({ taskId: task._id, taskerId });
  if (existing) {
    if (existing.status === 'withdrawn') {
      existing.status = 'pending';
      existing.coverLetter = coverLetter;
      existing.proposedRate = Number(proposedRate);
      await existing.save();
      return res.status(200).json(new ApiResponse(200, existing, 'Application re-submitted'));
    }
    throw new ApiError(409, 'You have already applied to this task');
  }

  const application = await TaskApplication.create({
    taskId: task._id,
    taskerId,
    coverLetter,
    proposedRate: Number(proposedRate),
  });

  // Notify the client
  notifyNewApplication(
    String(task.clientId),
    String(task._id),
    task.title,
    getUserName(req)
  ).catch((err) => logger.warn('notifyNewApplication failed', err));

  res.status(201).json(new ApiResponse(201, application, 'Application submitted successfully'));
});

// GET /api/tasks/:id/applications  — client views all applications for their task
export const getApplications = asyncHandler(async (req: Request, res: Response) => {
  const userId = getUserId(req);
  const role = getUserRole(req);

  const task = await Task.findById(req.params.id).lean();
  if (!task) throw new ApiError(404, 'Task not found');
  if (role !== 'admin' && String(task.clientId) !== userId) {
    throw new ApiError(403, 'Access denied');
  }

  const applications = await TaskApplication.find({ taskId: req.params.id })
    .populate('taskerId', 'name avatar email')
    .sort({ createdAt: -1 })
    .lean();

  // Attach tasker profile info (rating, completedTasks) for each application
  const taskerIds = applications.map((a) => a.taskerId);
  const profiles = await TaskerProfile.find({ userId: { $in: taskerIds } })
    .select('userId avgRating totalReviews totalTasksCompleted headline isElite backgroundChecked')
    .lean();

  const profileMap = new Map(profiles.map((p) => [String(p.userId), p]));

  const enriched = applications.map((app) => ({
    ...app,
    taskerProfile: profileMap.get(String((app.taskerId as { _id?: unknown })?._id ?? app.taskerId)) ?? null,
  }));

  res.json(new ApiResponse(200, enriched, 'Applications fetched'));
});

// GET /api/tasks/:id/applications/mine  — tasker checks their own application
export const checkMyApplication = asyncHandler(async (req: Request, res: Response) => {
  const taskerId = getUserId(req);

  const application = await TaskApplication.findOne({
    taskId: req.params.id,
    taskerId,
  }).lean();

  res.json(new ApiResponse(200, application, 'Application fetched'));
});

// POST /api/tasks/:id/applications/:applicationId/accept  — client accepts an application
export const acceptApplication = asyncHandler(async (req: Request, res: Response) => {
  const clientId = getUserId(req);

  const task = await Task.findById(req.params.id);
  if (!task) throw new ApiError(404, 'Task not found');
  if (String(task.clientId) !== clientId) throw new ApiError(403, 'Access denied');
  if (task.status !== 'posted') throw new ApiError(400, 'This task is no longer accepting applications');

  // Atomically accept: only succeeds if the application is still pending.
  // Prevents two concurrent requests from both accepting the same application.
  const application = await TaskApplication.findOneAndUpdate(
    { _id: req.params.applicationId, taskId: task._id, status: 'pending' },
    { status: 'accepted' },
    { new: true }
  );
  if (!application) {
    const existing = await TaskApplication.findById(req.params.applicationId).lean();
    if (!existing) throw new ApiError(404, 'Application not found');
    if (String(existing.taskId) !== String(task._id)) throw new ApiError(400, 'Application does not belong to this task');
    throw new ApiError(400, 'This application is no longer pending');
  }

  // Ensure the tasker account is still active before assigning
  const taskerUser = await User.findById(application.taskerId).select('isBanned isVerified').lean();
  if (!taskerUser || taskerUser.isBanned) {
    await TaskApplication.findByIdAndUpdate(application._id, { status: 'pending' });
    throw new ApiError(400, 'This tasker account is no longer active — please choose another applicant');
  }

  // Calculate pricing from proposed rate × estimated hours
  const price = task.estimatedHours
    ? application.proposedRate * task.estimatedHours
    : application.proposedRate;
  const platformFee = Math.round((price * env.PLATFORM_FEE_PERCENT) / 100);
  const taskerEarnings = price - platformFee;

  // Atomically assign the task — only succeeds if it is still 'posted'.
  // Prevents two concurrent accepts on different applications from both assigning.
  const assignedTask = await Task.findOneAndUpdate(
    { _id: task._id, status: 'posted' },
    { taskerId: application.taskerId, status: 'assigned', price, platformFee, taskerEarnings },
    { new: true }
  );
  if (!assignedTask) {
    // Another concurrent request already assigned the task — roll back our accept.
    await TaskApplication.findByIdAndUpdate(application._id, { status: 'pending' });
    throw new ApiError(409, 'Task was already assigned by a concurrent request — please refresh and try again');
  }

  // Reject all other pending applications
  await TaskApplication.updateMany(
    { taskId: task._id, _id: { $ne: application._id }, status: 'pending' },
    { status: 'rejected' }
  );

  // Notify the accepted tasker
  notifyApplicationAccepted(String(application.taskerId), String(task._id), task.title).catch((err) => logger.warn('notifyApplicationAccepted failed', err));
  notifyTaskAssigned(String(application.taskerId), String(task._id), task.title).catch((err) => logger.warn('notifyTaskAssigned failed', err));

  // Notify all rejected applicants
  const rejected = await TaskApplication.find({
    taskId: task._id,
    status: 'rejected',
    _id: { $ne: application._id },
  }).select('taskerId').lean();

  for (const r of rejected) {
    notifyApplicationRejected(String(r.taskerId), String(task._id), task.title).catch((err) => logger.warn('notifyApplicationRejected failed', err));
  }

  const populated = await populateTask(Task.findById(assignedTask._id));

  res.json(new ApiResponse(200, { task: populated, application }, 'Application accepted — tasker assigned'));
});

// POST /api/tasks/:id/applications/:applicationId/reject  — client rejects an application
export const rejectApplication = asyncHandler(async (req: Request, res: Response) => {
  const clientId = getUserId(req);

  const task = await Task.findById(req.params.id).lean();
  if (!task) throw new ApiError(404, 'Task not found');
  if (String(task.clientId) !== clientId) throw new ApiError(403, 'Access denied');

  const application = await TaskApplication.findById(req.params.applicationId);
  if (!application) throw new ApiError(404, 'Application not found');
  if (String(application.taskId) !== String(task._id)) throw new ApiError(400, 'Application does not belong to this task');
  if (application.status !== 'pending') throw new ApiError(400, 'Application is not pending');

  application.status = 'rejected';
  await application.save();

  notifyApplicationRejected(String(application.taskerId), String(task._id), task.title).catch((err) => logger.warn('notifyApplicationRejected failed', err));

  res.json(new ApiResponse(200, application, 'Application rejected'));
});

// DELETE /api/tasks/:id/applications/mine  — tasker withdraws their application
export const withdrawApplication = asyncHandler(async (req: Request, res: Response) => {
  const taskerId = getUserId(req);

  const application = await TaskApplication.findOne({ taskId: req.params.id, taskerId });
  if (!application) throw new ApiError(404, 'Application not found');
  if (application.status !== 'pending') throw new ApiError(400, 'Cannot withdraw a non-pending application');

  application.status = 'withdrawn';
  await application.save();

  res.json(new ApiResponse(200, application, 'Application withdrawn'));
});

// GET /api/tasks/my-applications  — tasker sees all their applications
export const getMyApplications = asyncHandler(async (req: Request, res: Response) => {
  const taskerId = getUserId(req);
  const { status, page = 1, limit = 10 } = req.query;

  const filter: Record<string, unknown> = { taskerId };
  if (status) filter.status = status;

  const skip = (Number(page) - 1) * Number(limit);
  const [applications, total] = await Promise.all([
    TaskApplication.find(filter)
      .populate({
        path: 'taskId',
        populate: [
          { path: 'clientId', select: 'name avatar' },
          { path: 'categoryId', select: 'name slug icon' },
        ],
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit)),
    TaskApplication.countDocuments(filter),
  ]);

  res.json(
    new ApiResponse(
      200,
      { data: applications, total, page: Number(page), limit: Number(limit), totalPages: Math.ceil(total / Number(limit)) },
      'My applications fetched'
    )
  );
});
