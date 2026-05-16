import { Request, Response } from 'express';
import { Dispute } from '../models/Dispute';
import { Task } from '../models/Task';
import { IUser } from '../models/User'; // still needed for populated field type guards
import { asyncHandler } from '../utils/asyncHandler';
import { ApiResponse } from '../utils/ApiResponse';
import { ApiError } from '../utils/ApiError';
import { uploadBuffer } from '../services/cloudinary.service';
import * as stripeService from '../services/stripe.service';
import { notifyDisputeUpdate } from '../services/notification.service';
import { getUserId, getUserRole } from '../utils/requestHelpers';

// POST /api/disputes
export const createDispute = asyncHandler(async (req: Request, res: Response) => {
  const userId = getUserId(req);
  const { taskId, reason, description } = req.body;

  if (!taskId || !reason || !description) throw new ApiError(400, 'taskId, reason, and description are required');

  const task = await Task.findById(taskId).lean();
  if (!task) throw new ApiError(404, 'Task not found');

  if (!task.taskerId) throw new ApiError(400, 'Task has no assigned tasker');

  const isClient = String(task.clientId) === userId;
  const isTasker = String(task.taskerId) === userId;
  if (!isClient && !isTasker) throw new ApiError(403, 'You are not a participant in this task');

  if (['posted', 'completed', 'cancelled'].includes(task.status)) {
    throw new ApiError(400, 'Disputes can only be raised on in-progress or assigned tasks');
  }

  const existing = await Dispute.findOne({ taskId, raisedBy: userId }).lean();
  if (existing) throw new ApiError(409, 'You have already raised a dispute for this task');

  const dispute = await Dispute.create({
    taskId,
    clientId: task.clientId,
    taskerId: task.taskerId,
    raisedBy: userId,
    reason,
    description,
    evidence: [],
  });

  const otherId = isClient ? String(task.taskerId) : String(task.clientId);
  notifyDisputeUpdate(otherId, String(dispute._id), `A dispute has been raised for task: ${task.title}`).catch(() => null);

  return res.status(201).json(new ApiResponse(201, dispute, 'Dispute submitted'));
});

// GET /api/disputes  — authenticated user sees their own disputes
export const getMyDisputes = asyncHandler(async (req: Request, res: Response) => {
  const userId = getUserId(req);
  const userRole = getUserRole(req);

  const filter = userRole === 'admin' ? {} : {
    $or: [{ clientId: userId }, { taskerId: userId }],
  };

  const disputes = await Dispute.find(filter)
    .populate('taskId', 'title status')
    .populate('clientId', 'name avatar')
    .populate('taskerId', 'name avatar')
    .sort({ createdAt: -1 })
    .lean();

  return res.json(new ApiResponse(200, disputes));
});

// GET /api/disputes/:id
export const getDisputeById = asyncHandler(async (req: Request, res: Response) => {
  const userId = getUserId(req);
  const userRole = getUserRole(req);

  const dispute = await Dispute.findById(req.params.id)
    .populate('taskId', 'title status paymentIntentId')
    .populate('clientId', 'name avatar email')
    .populate('taskerId', 'name avatar email')
    .populate('raisedBy', 'name avatar')
    .populate('adminId', 'name')
    .lean();

  if (!dispute) throw new ApiError(404, 'Dispute not found');

  const isParty =
    userRole === 'admin' ||
    String(dispute.clientId) === userId ||
    String((dispute.clientId as unknown as IUser)?._id) === userId ||
    String(dispute.taskerId) === userId ||
    String((dispute.taskerId as unknown as IUser)?._id) === userId;

  if (!isParty) throw new ApiError(403, 'Forbidden');

  return res.json(new ApiResponse(200, dispute));
});

// PUT /api/disputes/:id/evidence  — upload evidence files
export const uploadEvidence = asyncHandler(async (req: Request, res: Response) => {
  const userId = getUserId(req);
  const dispute = await Dispute.findById(req.params.id);
  if (!dispute) throw new ApiError(404, 'Dispute not found');

  const isParty = String(dispute.clientId) === userId || String(dispute.taskerId) === userId;
  if (!isParty) throw new ApiError(403, 'Forbidden');
  if (dispute.status !== 'open') throw new ApiError(400, 'Cannot add evidence after review has started');

  const files = req.files as Express.Multer.File[];
  if (!files?.length) throw new ApiError(400, 'No files uploaded');

  const urls = await Promise.all(
    files.map((f) => uploadBuffer(f.buffer, f.mimetype, 'disputes'))
  );

  dispute.evidence.push(...urls);
  await dispute.save();

  return res.json(new ApiResponse(200, dispute));
});

// PUT /api/disputes/:id/status  — admin changes status
export const updateDisputeStatus = asyncHandler(async (req: Request, res: Response) => {
  const adminUserId = getUserId(req);
  const { status, adminNotes, aiSummary, aiSuggestedResolution } = req.body;

  const VALID = ['open', 'under_review', 'resolved_refund', 'resolved_release', 'closed'];
  if (!VALID.includes(status)) throw new ApiError(400, 'Invalid status');

  const dispute = await Dispute.findByIdAndUpdate(
    req.params.id,
    { status, adminId: adminUserId, adminNotes, aiSummary, aiSuggestedResolution },
    { new: true }
  ).populate('taskId', 'title');

  if (!dispute) throw new ApiError(404, 'Dispute not found');

  const taskTitle = (dispute.taskId as unknown as { title: string })?.title ?? 'your task';
  const statusMsg: Record<string, string> = {
    under_review: `Your dispute is under review by our team.`,
    resolved_refund: `Your dispute has been resolved with a refund.`,
    resolved_release: `Your dispute has been resolved: payment released to tasker.`,
    closed: `Your dispute has been closed.`,
  };
  const msg = statusMsg[status] ?? `Dispute status updated to: ${status}`;

  notifyDisputeUpdate(String(dispute.clientId), String(dispute._id), msg).catch(() => null);
  notifyDisputeUpdate(String(dispute.taskerId), String(dispute._id), msg).catch(() => null);

  return res.json(new ApiResponse(200, dispute));
});

// POST /api/disputes/:id/resolve  — admin finalises with payment action
export const resolveDispute = asyncHandler(async (req: Request, res: Response) => {
  const adminUserId = getUserId(req);
  const { resolution, refundAmount, adminNotes } = req.body;

  const VALID_RES = ['full_refund', 'partial_refund', 'no_refund'];
  if (!VALID_RES.includes(resolution)) throw new ApiError(400, 'Invalid resolution');

  const dispute = await Dispute.findById(req.params.id).populate('taskId').lean();
  if (!dispute) throw new ApiError(404, 'Dispute not found');

  const task = dispute.taskId as unknown as { _id: string; paymentIntentId?: string; price?: number; title: string };

  // Issue Stripe refund if applicable
  if (resolution !== 'no_refund' && task.paymentIntentId) {
    const amount = resolution === 'full_refund' ? task.price : (refundAmount ?? 0);
    if (amount && amount > 0) {
      try {
        await stripeService.refundPayment(task.paymentIntentId, Math.round(amount * 100));
      } catch {
        // Non-fatal: log and continue
      }
    }
  }

  const updated = await Dispute.findByIdAndUpdate(
    req.params.id,
    {
      status: resolution === 'no_refund' ? 'resolved_release' : 'resolved_refund',
      resolution,
      refundAmount: refundAmount ?? null,
      adminId: adminUserId,
      adminNotes: adminNotes ?? '',
    },
    { new: true }
  );

  const msg = resolution === 'no_refund'
    ? 'Dispute resolved: payment released to tasker.'
    : `Dispute resolved: refund of $${(refundAmount ?? task.price ?? 0).toFixed(2)} issued.`;

  notifyDisputeUpdate(String(dispute.clientId), String(dispute._id), msg).catch(() => null);
  notifyDisputeUpdate(String(dispute.taskerId), String(dispute._id), msg).catch(() => null);

  return res.json(new ApiResponse(200, updated));
});
