import { Request, Response } from 'express';
import { Notification } from '../models/Notification';
import { IUser } from '../models/User';
import { asyncHandler } from '../utils/asyncHandler';
import { ApiResponse } from '../utils/ApiResponse';
import { ApiError } from '../utils/ApiError';

const uid = (u: Express.User) => String((u as unknown as IUser)._id);

export const getNotifications = asyncHandler(async (req: Request, res: Response) => {
  const userId = uid(req.user!);
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit = 20;

  const [notifications, total, unread] = await Promise.all([
    Notification.find({ userId })
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    Notification.countDocuments({ userId }),
    Notification.countDocuments({ userId, isRead: false }),
  ]);

  return res.json(new ApiResponse(200, { notifications, total, unread, page, pages: Math.ceil(total / limit) }));
});

export const getUnreadCount = asyncHandler(async (req: Request, res: Response) => {
  const userId = uid(req.user!);
  const count = await Notification.countDocuments({ userId, isRead: false });
  return res.json(new ApiResponse(200, count));
});

export const markRead = asyncHandler(async (req: Request, res: Response) => {
  const userId = uid(req.user!);
  const notif = await Notification.findOneAndUpdate(
    { _id: req.params.id, userId },
    { isRead: true },
    { new: true }
  );
  if (!notif) throw new ApiError(404, 'Notification not found');
  return res.json(new ApiResponse(200, notif));
});

export const markAllRead = asyncHandler(async (req: Request, res: Response) => {
  const userId = uid(req.user!);
  await Notification.updateMany({ userId, isRead: false }, { isRead: true });
  return res.json(new ApiResponse(200, null, 'All notifications marked as read'));
});

export const deleteNotification = asyncHandler(async (req: Request, res: Response) => {
  const userId = uid(req.user!);
  const notif = await Notification.findOneAndDelete({ _id: req.params.id, userId });
  if (!notif) throw new ApiError(404, 'Notification not found');
  return res.json(new ApiResponse(200, null, 'Deleted'));
});
