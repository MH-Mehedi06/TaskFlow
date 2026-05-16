import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import { Task } from '../models/Task';
import { TaskerProfile } from '../models/TaskerProfile';
import { IUser } from '../models/User';
import { asyncHandler } from '../utils/asyncHandler';
import { ApiError } from '../utils/ApiError';
import { ApiResponse } from '../utils/ApiResponse';
import { uploadBuffer } from '../services/cloudinary.service';
import * as stripeService from '../services/stripe.service';
import { env } from '../config/env';
import {
  notifyTaskAssigned,
  notifyTaskCompleted,
  notifyPaymentReceived,
} from '../services/notification.service';

const getUserId = (user: Express.User) => String((user as unknown as IUser)._id);
const getUserRole = (user: Express.User) => (user as unknown as IUser).role;

const populateTask = (query: ReturnType<typeof Task.findById | typeof Task.findOne>) =>
  query
    .populate('clientId', 'name avatar email phone')
    .populate('taskerId', 'name avatar email phone')
    .populate('categoryId', 'name slug icon');

// POST /api/tasks
export const createTask = asyncHandler(async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) throw new ApiError(422, 'Validation failed', errors.array());

  const clientId = getUserId(req.user!);
  const { categoryId, title, description, photos, address, scheduledAt, estimatedHours, taskerId, notes } = req.body;

  let price: number | undefined;
  let platformFee: number | undefined;
  let taskerEarnings: number | undefined;
  let status: 'posted' | 'assigned' = 'posted';

  if (taskerId && estimatedHours) {
    const profile = await TaskerProfile.findOne({ userId: taskerId });
    if (profile) {
      const rateEntry = profile.hourlyRates.find((r) => String(r.categoryId) === String(categoryId));
      if (rateEntry) {
        price = rateEntry.rate * Number(estimatedHours);
        platformFee = Math.round((price * env.PLATFORM_FEE_PERCENT) / 100);
        taskerEarnings = price - platformFee;
        status = 'assigned';
      }
    }
  }

  const task = await Task.create({
    clientId,
    taskerId: taskerId || undefined,
    categoryId,
    title,
    description,
    photos: photos || [],
    address,
    scheduledAt: new Date(scheduledAt),
    estimatedHours: estimatedHours ? Number(estimatedHours) : undefined,
    price,
    platformFee,
    taskerEarnings,
    notes,
    status,
  });

  const populated = await populateTask(Task.findById(task._id));
  res.status(201).json(new ApiResponse(201, populated, 'Task created successfully'));
});

// GET /api/tasks/stats
export const getMyTaskStats = asyncHandler(async (req: Request, res: Response) => {
  const userId = getUserId(req.user!);
  const role = getUserRole(req.user!);
  const matchField = role === 'tasker' ? 'taskerId' : 'clientId';
  const mongoose = await import('mongoose');

  const rows = await Task.aggregate([
    { $match: { [matchField]: new mongoose.Types.ObjectId(userId) } },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        revenue: { $sum: role === 'tasker' ? '$taskerEarnings' : '$price' },
      },
    },
  ]);

  const result: Record<string, number> = {
    posted: 0, assigned: 0, in_progress: 0, completed: 0, cancelled: 0, total: 0, totalSpent: 0, totalEarned: 0,
  };
  for (const row of rows) {
    result[row._id as string] = row.count;
    result.total += row.count as number;
    if (row._id === 'completed') {
      if (role === 'tasker') result.totalEarned = row.revenue ?? 0;
      else result.totalSpent = row.revenue ?? 0;
    }
  }

  const upcoming = await Task.countDocuments({
    [matchField]: userId,
    status: { $in: ['assigned', 'in_progress'] },
    scheduledAt: { $gte: new Date() },
  });
  result.upcoming = upcoming;

  res.json(new ApiResponse(200, result, 'Stats fetched'));
});

// GET /api/tasks  — client sees their tasks, tasker sees assigned + self-booked tasks
export const getMyTasks = asyncHandler(async (req: Request, res: Response) => {
  const userId = getUserId(req.user!);
  const role = getUserRole(req.user!);
  const { status, page = 1, limit = 10 } = req.query;

  const ownerFilter =
    role === 'tasker'
      ? { $or: [{ taskerId: userId }, { clientId: userId }] }
      : { clientId: userId };
  const filter: Record<string, unknown> = { ...ownerFilter };
  if (status) filter.status = status;

  const skip = (Number(page) - 1) * Number(limit);
  const [tasks, total] = await Promise.all([
    Task.find(filter)
      .populate('clientId', 'name avatar')
      .populate('taskerId', 'name avatar')
      .populate('categoryId', 'name slug icon')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit)),
    Task.countDocuments(filter),
  ]);

  res.json(
    new ApiResponse(
      200,
      { data: tasks, total, page: Number(page), limit: Number(limit), totalPages: Math.ceil(total / Number(limit)) },
      'Tasks fetched'
    )
  );
});

// GET /api/tasks/available  — tasker sees posted tasks matching their skills
export const getAvailableTasks = asyncHandler(async (req: Request, res: Response) => {
  const userId = getUserId(req.user!);
  const { page = 1, limit = 10 } = req.query;

  const profile = await TaskerProfile.findOne({ userId });
  const skillIds = profile?.skills ?? [];

  const skip = (Number(page) - 1) * Number(limit);
  const filter = { status: 'posted', ...(skillIds.length ? { categoryId: { $in: skillIds } } : {}) };

  const [tasks, total] = await Promise.all([
    Task.find(filter)
      .populate('clientId', 'name avatar')
      .populate('categoryId', 'name slug icon')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit)),
    Task.countDocuments(filter),
  ]);

  res.json(
    new ApiResponse(
      200,
      { data: tasks, total, page: Number(page), limit: Number(limit), totalPages: Math.ceil(total / Number(limit)) },
      'Available tasks fetched'
    )
  );
});

// GET /api/tasks/:id
export const getTaskById = asyncHandler(async (req: Request, res: Response) => {
  const userId = getUserId(req.user!);
  const role = getUserRole(req.user!);

  // First fetch lean to check ownership, then fetch populated for response
  const raw = await Task.findById(req.params.id).lean();
  if (!raw) throw new ApiError(404, 'Task not found');

  const clientOwnerId = String(raw.clientId);
  const taskerOwnerId = raw.taskerId ? String(raw.taskerId) : null;

  if (role !== 'admin' && clientOwnerId !== userId && taskerOwnerId !== userId) {
    throw new ApiError(403, 'Access denied');
  }

  const task = await populateTask(Task.findById(req.params.id));
  res.json(new ApiResponse(200, task, 'Task fetched'));
});

// PUT /api/tasks/:id
export const updateTask = asyncHandler(async (req: Request, res: Response) => {
  const userId = getUserId(req.user!);
  const task = await Task.findById(req.params.id);
  if (!task) throw new ApiError(404, 'Task not found');
  if (String(task.clientId) !== userId) throw new ApiError(403, 'Access denied');
  if (!['draft', 'posted'].includes(task.status)) throw new ApiError(400, 'Cannot update task in its current status');

  const { title, description, address, scheduledAt, estimatedHours, notes } = req.body;
  if (title) task.title = title;
  if (description) task.description = description;
  if (address) task.address = address;
  if (scheduledAt) task.scheduledAt = new Date(scheduledAt);
  if (estimatedHours) task.estimatedHours = Number(estimatedHours);
  if (notes !== undefined) task.notes = notes;
  await task.save();

  res.json(new ApiResponse(200, task, 'Task updated'));
});

// PUT /api/tasks/:id/status
export const updateTaskStatus = asyncHandler(async (req: Request, res: Response) => {
  const userId = getUserId(req.user!);
  const role = getUserRole(req.user!);
  const { status, taskerId } = req.body;

  const task = await Task.findById(req.params.id);
  if (!task) throw new ApiError(404, 'Task not found');

  const isClient = String(task.clientId) === userId;
  const isTasker = task.taskerId ? String(task.taskerId) === userId : false;
  const isAdmin = role === 'admin';

  // Any authenticated user can accept a posted task that has no tasker yet
  const isOpenAcceptance = status === 'assigned' && !task.taskerId && task.status === 'posted';

  if (!isAdmin && !isClient && !isTasker && !isOpenAcceptance) {
    throw new ApiError(403, 'Access denied');
  }

  // Validate the status transition
  const ALLOWED: Record<string, string[]> = {
    posted: ['assigned'],
    assigned: ['in_progress'],
    in_progress: ['completed'],
  };
  const allowed = ALLOWED[task.status] ?? [];
  if (!isAdmin && !allowed.includes(status)) {
    throw new ApiError(400, `Cannot transition from '${task.status}' to '${status}'`);
  }

  task.status = status;
  // Auto-assign current user as tasker when accepting an open task
  if (status === 'assigned' && !task.taskerId) {
    task.taskerId = (taskerId || userId) as unknown as typeof task.taskerId;
  }
  await task.save();

  // Notifications (fire-and-forget)
  if (status === 'assigned' && task.taskerId) {
    notifyTaskAssigned(String(task.taskerId), String(task._id), task.title).catch(() => null);
  }
  if (status === 'completed') {
    notifyTaskCompleted(String(task.clientId), String(task._id), task.title).catch(() => null);
  }

  // Auto-capture held payment when task is completed
  if (status === 'completed' && task.paymentStatus === 'held' && task.paymentIntentId) {
    try {
      await stripeService.capturePaymentIntent(task.paymentIntentId);
      task.paymentStatus = 'captured';
      await task.save();

      if (task.taskerEarnings) {
        notifyPaymentReceived(String(task.taskerId), String(task._id), task.title, task.taskerEarnings).catch(() => null);
      }

      // Transfer earnings to tasker
      if (task.taskerId && task.taskerEarnings) {
        const profile = await TaskerProfile.findOne({ userId: task.taskerId });
        if (profile?.stripeAccountId) {
          await stripeService.createTransfer(task.taskerEarnings, profile.stripeAccountId, {
            taskId: String(task._id),
          });
        }
      }
    } catch {
      // Non-fatal: payment capture failed, admin can retry
    }
  }

  res.json(new ApiResponse(200, task, 'Task status updated'));
});

// POST /api/tasks/:id/cancel
export const cancelTask = asyncHandler(async (req: Request, res: Response) => {
  const userId = getUserId(req.user!);
  const { reason } = req.body;

  const task = await Task.findById(req.params.id);
  if (!task) throw new ApiError(404, 'Task not found');
  if (String(task.clientId) !== userId) throw new ApiError(403, 'Access denied');
  if (['completed', 'cancelled'].includes(task.status)) throw new ApiError(400, 'Task is already finalised');

  task.status = 'cancelled';
  task.cancellationReason = reason;
  await task.save();

  res.json(new ApiResponse(200, task, 'Task cancelled'));
});

// POST /api/tasks/:id/photos
export const uploadTaskPhotos = asyncHandler(async (req: Request, res: Response) => {
  const userId = getUserId(req.user!);
  if (!req.files || !(req.files as Express.Multer.File[]).length) throw new ApiError(400, 'No files uploaded');

  const task = await Task.findById(req.params.id);
  if (!task) throw new ApiError(404, 'Task not found');
  if (String(task.clientId) !== userId) throw new ApiError(403, 'Access denied');

  const files = req.files as Express.Multer.File[];
  const urls = await Promise.all(
    files.map((f, i) => uploadBuffer(f.buffer, 'task-photos', `task_${task._id}_${Date.now()}_${i}`))
  );

  task.photos.push(...urls);
  await task.save();

  res.json(new ApiResponse(200, { photos: task.photos }, 'Photos uploaded'));
});
