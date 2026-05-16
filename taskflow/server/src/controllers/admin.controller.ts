import { Request, Response } from 'express';
import { User } from '../models/User';
import { Task } from '../models/Task';
import { TaskerProfile } from '../models/TaskerProfile';
import { Category } from '../models/Category';
import { Review } from '../models/Review';
import { Dispute } from '../models/Dispute';
import { Notification } from '../models/Notification';
import { PlatformSettings } from '../models/PlatformSettings';
import { AuditLog, AuditAction, IAuditLog } from '../models/AuditLog';
import { asyncHandler } from '../utils/asyncHandler';
import { ApiResponse } from '../utils/ApiResponse';
import { ApiError } from '../utils/ApiError';
import { getUserId } from '../utils/requestHelpers';

async function recordAuditLog(
  req: Request,
  action: AuditAction,
  targetType: IAuditLog['targetType'],
  targetId?: string,
  targetLabel?: string,
  details?: string,
) {
  try {
    const admin = req.user!;
    const forwarded = req.headers['x-forwarded-for'];
    const ip = Array.isArray(forwarded) ? forwarded[0] : (forwarded ?? req.ip ?? '');
    await AuditLog.create({
      adminId: admin._id,
      adminName: admin.name,
      action,
      targetType,
      targetId,
      targetLabel,
      details,
      ip: String(ip),
    });
  } catch (err) {
    console.error('[AuditLog]', err);
  }
}

// ── Stats overview ────────────────────────────────────────────────────────────

export const getStats = asyncHandler(async (_req: Request, res: Response) => {
  const [
    totalUsers,
    totalTaskers,
    totalClients,
    tasksByStatus,
    totalRevenue,
    openDisputes,
    pendingReviews,
    recentUsers,
  ] = await Promise.all([
    User.countDocuments(),
    User.countDocuments({ role: 'tasker' }),
    User.countDocuments({ role: 'client' }),
    Task.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
    Task.aggregate([
      { $match: { paymentStatus: 'captured' } },
      { $group: { _id: null, total: { $sum: '$platformFee' } } },
    ]),
    Dispute.countDocuments({ status: { $in: ['open', 'under_review'] } }),
    Review.countDocuments({ isApproved: false }),
    User.countDocuments({ createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } }),
  ]);

  const taskStatusMap: Record<string, number> = {};
  for (const t of tasksByStatus) taskStatusMap[t._id] = t.count;

  const monthlyRevenue = await Task.aggregate([
    { $match: { paymentStatus: 'captured', updatedAt: { $gte: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000) } } },
    {
      $group: {
        _id: { year: { $year: '$updatedAt' }, month: { $month: '$updatedAt' } },
        revenue: { $sum: '$platformFee' },
        tasks: { $sum: 1 },
      },
    },
    { $sort: { '_id.year': 1, '_id.month': 1 } },
  ]);

  return res.json(new ApiResponse(200, {
    users: { total: totalUsers, taskers: totalTaskers, clients: totalClients, recentSignups: recentUsers },
    tasks: taskStatusMap,
    revenue: { total: totalRevenue[0]?.total ?? 0, monthly: monthlyRevenue },
    openDisputes,
    pendingReviews,
  }));
});

// ── Users ─────────────────────────────────────────────────────────────────────

export const getUsers = asyncHandler(async (req: Request, res: Response) => {
  const { role, search, page = 1, limit = 20 } = req.query;
  const skip = (Number(page) - 1) * Number(limit);

  const filter: Record<string, unknown> = {};
  if (role) filter.role = role;
  if (search) filter.$or = [
    { name: { $regex: search, $options: 'i' } },
    { email: { $regex: search, $options: 'i' } },
  ];

  const [users, total] = await Promise.all([
    User.find(filter)
      .select('-password -refreshTokenHash')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .lean(),
    User.countDocuments(filter),
  ]);

  return res.json(new ApiResponse(200, { users, total, page: Number(page), pages: Math.ceil(total / Number(limit)) }));
});

export const getUserById = asyncHandler(async (req: Request, res: Response) => {
  const user = await User.findById(req.params.id).select('-password -refreshTokenHash').lean();
  if (!user) throw new ApiError(404, 'User not found');

  const [profile, taskCount] = await Promise.all([
    TaskerProfile.findOne({ userId: req.params.id }).lean(),
    Task.countDocuments({ $or: [{ clientId: req.params.id }, { taskerId: req.params.id }] }),
  ]);

  return res.json(new ApiResponse(200, { user, profile, taskCount }));
});

export const updateUserRole = asyncHandler(async (req: Request, res: Response) => {
  const adminId = getUserId(req);
  const { role } = req.body;
  if (!['client', 'tasker', 'admin'].includes(role)) throw new ApiError(400, 'Invalid role');
  if (req.params.id === adminId) throw new ApiError(400, 'Cannot change your own role');

  const user = await User.findByIdAndUpdate(req.params.id, { role }, { new: true }).select('-password -refreshTokenHash');
  if (!user) throw new ApiError(404, 'User not found');
  void recordAuditLog(req, 'update_role', 'user', String(user._id), user.name, `Role set to ${role}`);
  return res.json(new ApiResponse(200, user, 'Role updated'));
});

export const banUser = asyncHandler(async (req: Request, res: Response) => {
  const adminId = getUserId(req);
  const { banned } = req.body;
  if (req.params.id === adminId) throw new ApiError(400, 'Cannot ban yourself');

  const user = await User.findByIdAndUpdate(req.params.id, { isBanned: !!banned }, { new: true }).select('-password -refreshTokenHash');
  if (!user) throw new ApiError(404, 'User not found');
  void recordAuditLog(req, banned ? 'ban_user' : 'unban_user', 'user', String(user._id), user.name);
  return res.json(new ApiResponse(200, user, banned ? 'User banned' : 'User unbanned'));
});

// ── Tasks ─────────────────────────────────────────────────────────────────────

export const getAllTasks = asyncHandler(async (req: Request, res: Response) => {
  const { status, search, page = 1, limit = 20 } = req.query;
  const skip = (Number(page) - 1) * Number(limit);

  const filter: Record<string, unknown> = {};
  if (status) filter.status = status;
  if (search) filter.title = { $regex: search, $options: 'i' };

  const [tasks, total] = await Promise.all([
    Task.find(filter)
      .populate('clientId', 'name avatar email')
      .populate('taskerId', 'name avatar email')
      .populate('categoryId', 'name icon')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .lean(),
    Task.countDocuments(filter),
  ]);

  return res.json(new ApiResponse(200, { tasks, total, page: Number(page), pages: Math.ceil(total / Number(limit)) }));
});

// ── Assign tasker to a task ────────────────────────────────────────────────────

export const assignTasker = asyncHandler(async (req: Request, res: Response) => {
  const { taskerId } = req.body;
  if (!taskerId) throw new ApiError(400, 'taskerId is required');

  const task = await Task.findById(req.params.id);
  if (!task) throw new ApiError(404, 'Task not found');
  if (task.status === 'completed' || task.status === 'cancelled') {
    throw new ApiError(400, `Cannot assign a tasker to a ${task.status} task`);
  }

  const profile = await TaskerProfile.findOne({ userId: taskerId }).populate('userId', 'name');
  if (!profile) throw new ApiError(404, 'Tasker profile not found');

  task.taskerId = taskerId;
  task.status = 'assigned';
  await task.save();

  const taskerName = (profile.userId as unknown as { name: string })?.name ?? taskerId;
  void recordAuditLog(req, 'assign_tasker', 'task', String(task._id), task.title, `Assigned tasker: ${taskerName}`);

  const populated = await Task.findById(task._id)
    .populate('clientId', 'name avatar email')
    .populate('taskerId', 'name avatar email')
    .populate('categoryId', 'name icon')
    .lean();

  return res.json(new ApiResponse(200, populated, 'Tasker assigned successfully'));
});

// ── Reviews (moderation) ──────────────────────────────────────────────────────

export const getPendingReviews = asyncHandler(async (_req: Request, res: Response) => {
  const reviews = await Review.find({ isApproved: false })
    .populate('reviewerId', 'name avatar')
    .populate('revieweeId', 'name avatar')
    .populate('taskId', 'title')
    .sort({ createdAt: -1 })
    .lean();
  return res.json(new ApiResponse(200, reviews));
});

export const moderateReview = asyncHandler(async (req: Request, res: Response) => {
  const { approved } = req.body;
  const review = await Review.findByIdAndUpdate(req.params.id, { isApproved: !!approved }, { new: true });
  if (!review) throw new ApiError(404, 'Review not found');
  if (approved) await review.save();
  void recordAuditLog(req, approved ? 'approve_review' : 'reject_review', 'review', String(review._id));
  return res.json(new ApiResponse(200, review, approved ? 'Review approved' : 'Review rejected'));
});

// ── Disputes ──────────────────────────────────────────────────────────────────

export const getAllDisputes = asyncHandler(async (req: Request, res: Response) => {
  const { status, page = 1, limit = 20 } = req.query;
  const skip = (Number(page) - 1) * Number(limit);

  const filter: Record<string, unknown> = {};
  if (status) filter.status = status;

  const [disputes, total] = await Promise.all([
    Dispute.find(filter)
      .populate('taskId', 'title status price')
      .populate('clientId', 'name avatar email')
      .populate('taskerId', 'name avatar email')
      .populate('raisedBy', 'name')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .lean(),
    Dispute.countDocuments(filter),
  ]);

  return res.json(new ApiResponse(200, { disputes, total, page: Number(page), pages: Math.ceil(total / Number(limit)) }));
});

// ── Send system notification ──────────────────────────────────────────────────

export const sendSystemNotification = asyncHandler(async (req: Request, res: Response) => {
  const { userIds, title, body, link } = req.body;
  if (!title || !body) throw new ApiError(400, 'title and body required');

  const { createNotification } = await import('../services/notification.service');

  const targets: string[] = userIds?.length
    ? userIds
    : (await User.find().select('_id').lean()).map((u) => String(u._id));

  await Promise.allSettled(
    targets.map((userId) => createNotification({ userId, type: 'system', title, body, link }))
  );

  void recordAuditLog(req, 'broadcast_notification', 'notification', undefined, title, `Sent to ${targets.length} users`);
  return res.json(new ApiResponse(200, null, `Notification sent to ${targets.length} users`));
});

// ── Delete user ───────────────────────────────────────────────────────────────

export const deleteUser = asyncHandler(async (req: Request, res: Response) => {
  const adminId = getUserId(req);
  if (req.params.id === adminId) throw new ApiError(400, 'Cannot delete yourself');

  const user = await User.findById(req.params.id);
  if (!user) throw new ApiError(404, 'User not found');

  if (user.role === 'admin') {
    const adminCount = await User.countDocuments({ role: 'admin' });
    if (adminCount <= 1) throw new ApiError(400, 'Cannot delete the last admin account');
  }

  const userName = user.name;
  await Promise.all([
    User.findByIdAndDelete(req.params.id),
    TaskerProfile.deleteOne({ userId: req.params.id }),
  ]);

  void recordAuditLog(req, 'delete_user', 'user', req.params.id, userName, `Role was ${user.role}`);
  return res.json(new ApiResponse(200, null, 'User deleted'));
});

// ── Resolve dispute ───────────────────────────────────────────────────────────

export const resolveDispute = asyncHandler(async (req: Request, res: Response) => {
  const adminId = getUserId(req);
  const { status, adminNotes, resolution, refundAmount } = req.body;

  const validStatuses = ['under_review', 'resolved_refund', 'resolved_release', 'closed'];
  if (!validStatuses.includes(status)) throw new ApiError(400, 'Invalid status');

  const dispute = await Dispute.findByIdAndUpdate(
    req.params.id,
    { status, adminId, adminNotes, ...(resolution && { resolution }), ...(refundAmount != null && { refundAmount }) },
    { new: true }
  )
    .populate('taskId', 'title status')
    .populate('clientId', 'name email')
    .populate('taskerId', 'name email');

  if (!dispute) throw new ApiError(404, 'Dispute not found');
  void recordAuditLog(req, 'resolve_dispute', 'dispute', String(dispute._id), undefined, `Status: ${status}`);
  return res.json(new ApiResponse(200, dispute, 'Dispute updated'));
});

// ── Categories CRUD ───────────────────────────────────────────────────────────

export const getAdminCategories = asyncHandler(async (req: Request, res: Response) => {
  const { page = 1, limit = 50, search } = req.query;
  const skip = (Number(page) - 1) * Number(limit);

  const filter: Record<string, unknown> = {};
  if (search) filter.name = { $regex: search, $options: 'i' };

  const [categories, total] = await Promise.all([
    Category.find(filter).sort({ sortOrder: 1, name: 1 }).skip(skip).limit(Number(limit)).lean(),
    Category.countDocuments(filter),
  ]);

  return res.json(new ApiResponse(200, { categories, total, page: Number(page), pages: Math.ceil(total / Number(limit)) }));
});

export const createCategory = asyncHandler(async (req: Request, res: Response) => {
  const { name, description, icon, startingPrice, isActive, sortOrder, trending, trendingTags } = req.body;
  if (!name?.trim()) throw new ApiError(400, 'Name is required');

  const category = await Category.create({
    name: name.trim(),
    description,
    icon,
    startingPrice: startingPrice ?? 0,
    isActive: isActive ?? true,
    sortOrder: sortOrder ?? 0,
    trending: trending ?? false,
    trendingTags: trendingTags ?? [],
  });

  void recordAuditLog(req, 'create_category', 'category', String(category._id), category.name);
  return res.status(201).json(new ApiResponse(201, category, 'Category created'));
});

export const updateCategory = asyncHandler(async (req: Request, res: Response) => {
  const updates = (({ name, description, icon, startingPrice, isActive, sortOrder, trending, trendingTags }) =>
    ({ name, description, icon, startingPrice, isActive, sortOrder, trending, trendingTags }))(req.body);

  const category = await Category.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true });
  if (!category) throw new ApiError(404, 'Category not found');
  void recordAuditLog(req, 'update_category', 'category', String(category._id), category.name);
  return res.json(new ApiResponse(200, category, 'Category updated'));
});

export const deleteCategory = asyncHandler(async (req: Request, res: Response) => {
  const category = await Category.findByIdAndDelete(req.params.id);
  if (!category) throw new ApiError(404, 'Category not found');
  void recordAuditLog(req, 'delete_category', 'category', req.params.id, category.name);
  return res.json(new ApiResponse(200, null, 'Category deleted'));
});

// ── Financials overview ───────────────────────────────────────────────────────

export const getFinancials = asyncHandler(async (req: Request, res: Response) => {
  const { period = '6m' } = req.query;
  const months = period === '12m' ? 12 : period === '3m' ? 3 : 6;
  const since = new Date(Date.now() - months * 30 * 24 * 60 * 60 * 1000);

  const [totals, monthly, topCategories, topTaskers, paymentBreakdown] = await Promise.all([
    Task.aggregate([
      { $match: { paymentStatus: 'captured' } },
      { $group: { _id: null, revenue: { $sum: '$platformFee' }, earnings: { $sum: '$taskerEarnings' }, taskValue: { $sum: '$price' }, count: { $sum: 1 } } },
    ]),
    Task.aggregate([
      { $match: { paymentStatus: 'captured', updatedAt: { $gte: since } } },
      { $group: { _id: { year: { $year: '$updatedAt' }, month: { $month: '$updatedAt' } }, revenue: { $sum: '$platformFee' }, earnings: { $sum: '$taskerEarnings' }, taskValue: { $sum: '$price' }, count: { $sum: 1 } } },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
    ]),
    Task.aggregate([
      { $match: { paymentStatus: 'captured' } },
      { $group: { _id: '$categoryId', revenue: { $sum: '$platformFee' }, count: { $sum: 1 } } },
      { $sort: { revenue: -1 } },
      { $limit: 5 },
      { $lookup: { from: 'categories', localField: '_id', foreignField: '_id', as: 'cat' } },
      { $unwind: { path: '$cat', preserveNullAndEmptyArrays: true } },
      { $project: { name: '$cat.name', icon: '$cat.icon', revenue: 1, count: 1 } },
    ]),
    Task.aggregate([
      { $match: { paymentStatus: 'captured', taskerId: { $exists: true, $ne: null } } },
      { $group: { _id: '$taskerId', earnings: { $sum: '$taskerEarnings' }, count: { $sum: 1 } } },
      { $sort: { earnings: -1 } },
      { $limit: 5 },
      { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'user' } },
      { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
      { $project: { name: '$user.name', avatar: '$user.avatar', earnings: 1, count: 1 } },
    ]),
    Task.aggregate([
      { $group: { _id: '$paymentStatus', count: { $sum: 1 }, value: { $sum: '$price' } } },
    ]),
  ]);

  return res.json(new ApiResponse(200, {
    summary: {
      totalRevenue: totals[0]?.revenue ?? 0,
      totalTaskerEarnings: totals[0]?.earnings ?? 0,
      totalTaskValue: totals[0]?.taskValue ?? 0,
      capturedTasks: totals[0]?.count ?? 0,
    },
    monthly,
    topCategories,
    topTaskers,
    paymentBreakdown,
    period: String(period),
  }));
});

// ── Admin taskers list ────────────────────────────────────────────────────────

export const getAdminTaskers = asyncHandler(async (req: Request, res: Response) => {
  const { page = 1, limit = 20, search, elite } = req.query;
  const skip = (Number(page) - 1) * Number(limit);

  const userFilter: Record<string, unknown> = { role: 'tasker' };
  if (search) userFilter.$or = [
    { name: { $regex: search, $options: 'i' } },
    { email: { $regex: search, $options: 'i' } },
  ];

  const matchingUserIds = (await User.find(userFilter, '_id').lean()).map((u) => u._id);

  const profileFilter: Record<string, unknown> = { userId: { $in: matchingUserIds } };
  if (elite === 'true') profileFilter.isElite = true;
  if (elite === 'false') profileFilter.isElite = false;

  const [taskers, total] = await Promise.all([
    TaskerProfile.find(profileFilter)
      .populate('userId', 'name email avatar isVerified isBanned isActive createdAt')
      .sort({ avgRating: -1 })
      .skip(skip)
      .limit(Number(limit))
      .lean(),
    TaskerProfile.countDocuments(profileFilter),
  ]);

  return res.json(new ApiResponse(200, { taskers, total, page: Number(page), pages: Math.ceil(total / Number(limit)) }));
});

export const toggleEliteBadge = asyncHandler(async (req: Request, res: Response) => {
  const { isElite } = req.body;
  const profile = await TaskerProfile.findByIdAndUpdate(req.params.id, { isElite: !!isElite }, { new: true });
  if (!profile) throw new ApiError(404, 'Tasker profile not found');
  void recordAuditLog(req, isElite ? 'grant_elite' : 'revoke_elite', 'tasker', String(profile._id));
  return res.json(new ApiResponse(200, profile, isElite ? 'Elite badge granted' : 'Elite badge removed'));
});

export const toggleBackgroundCheck = asyncHandler(async (req: Request, res: Response) => {
  const { backgroundChecked } = req.body;
  const profile = await TaskerProfile.findByIdAndUpdate(req.params.id, { backgroundChecked: !!backgroundChecked }, { new: true });
  if (!profile) throw new ApiError(404, 'Tasker profile not found');
  void recordAuditLog(req, backgroundChecked ? 'grant_bg_check' : 'revoke_bg_check', 'tasker', String(profile._id));
  return res.json(new ApiResponse(200, profile, 'Background check status updated'));
});

// ── Platform settings (singleton) ────────────────────────────────────────────

export const getSettings = asyncHandler(async (_req: Request, res: Response) => {
  const settings = await PlatformSettings.findOne().lean()
    ?? await PlatformSettings.create({});
  return res.json(new ApiResponse(200, settings));
});

export const updateSettings = asyncHandler(async (req: Request, res: Response) => {
  const { platformFeePercent, maintenanceMode, registrationOpen, maxTaskPrice, contactEmail } = req.body;
  const settings = await PlatformSettings.findOneAndUpdate(
    {},
    { platformFeePercent, maintenanceMode, registrationOpen, maxTaskPrice, contactEmail },
    { new: true, upsert: true, runValidators: true }
  );
  void recordAuditLog(req, 'update_settings', 'settings', undefined, undefined, `fee=${platformFeePercent}% maintenance=${maintenanceMode}`);
  return res.json(new ApiResponse(200, settings, 'Settings updated'));
});

// ── Audit log ────────────────────────────────────────────────────────────────

export const getAuditLog = asyncHandler(async (req: Request, res: Response) => {
  const { page = 1, limit = 20, action, targetType } = req.query;
  const skip = (Number(page) - 1) * Number(limit);

  const filter: Record<string, unknown> = {};
  if (action) filter.action = action;
  if (targetType) filter.targetType = targetType;

  const [logs, total] = await Promise.all([
    AuditLog.find(filter).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)).lean(),
    AuditLog.countDocuments(filter),
  ]);

  return res.json(new ApiResponse(200, { logs, total, page: Number(page), pages: Math.ceil(total / Number(limit)) }));
});

// ── Recent activity (dashboard feed) ────────────────────────────────────────

export const getRecentActivity = asyncHandler(async (_req: Request, res: Response) => {
  const [recentUsers, recentTasks, recentDisputes] = await Promise.all([
    User.find()
      .select('name email avatar role isVerified createdAt')
      .sort({ createdAt: -1 })
      .limit(6)
      .lean(),
    Task.find()
      .select('title status price scheduledAt clientId createdAt')
      .populate('clientId', 'name avatar')
      .sort({ createdAt: -1 })
      .limit(6)
      .lean(),
    Dispute.find({ status: { $in: ['open', 'under_review'] } })
      .select('reason status clientId taskerId createdAt')
      .populate('clientId', 'name')
      .populate('taskerId', 'name')
      .sort({ createdAt: -1 })
      .limit(4)
      .lean(),
  ]);

  return res.json(new ApiResponse(200, { recentUsers, recentTasks, recentDisputes }));
});
