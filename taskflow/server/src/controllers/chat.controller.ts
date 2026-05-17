import { Request, Response } from 'express';
import { Conversation } from '../models/Conversation';
import { Message } from '../models/Message';
import { Task } from '../models/Task';
import { asyncHandler } from '../utils/asyncHandler';
import { ApiResponse } from '../utils/ApiResponse';
import { ApiError } from '../utils/ApiError';
import { getUserId } from '../utils/requestHelpers';

export const getConversations = asyncHandler(async (req: Request, res: Response) => {
  const userId = getUserId(req);

  const conversations = await Conversation.find({ participants: userId })
    .populate('participants', 'name avatar')
    .populate({ path: 'taskId', select: 'title status categoryId', populate: { path: 'categoryId', select: 'name icon' } })
    .sort({ updatedAt: -1 })
    .lean();

  return res.json(new ApiResponse(200, conversations));
});

export const createOrGetConversation = asyncHandler(async (req: Request, res: Response) => {
  const userId = getUserId(req);
  const { taskId } = req.body;

  if (!taskId) throw new ApiError(400, 'taskId is required');

  const task = await Task.findById(taskId).lean();
  if (!task) throw new ApiError(404, 'Task not found');

  const clientId = String(task.clientId);
  const taskerId = task.taskerId ? String(task.taskerId) : null;

  const me = String(userId);
  if (me !== clientId && me !== taskerId) {
    throw new ApiError(403, 'Not a participant of this task');
  }

  let conv = await Conversation.findOne({ taskId })
    .populate('participants', 'name avatar')
    .lean();

  if (!conv) {
    // Create fresh — include tasker if already assigned
    const participants = taskerId
      ? [task.clientId, task.taskerId]
      : [task.clientId];

    const created = await Conversation.create({ taskId, participants });
    conv = await Conversation.findById(created._id)
      .populate('participants', 'name avatar')
      .lean();
  } else {
    // Conversation already exists — add tasker to participants if they were
    // assigned after the conversation was first created (common flow).
    const existingIds = conv.participants.map((p) =>
      String(typeof p === 'object' && '_id' in p ? (p as { _id: unknown })._id : p)
    );
    if (taskerId && !existingIds.includes(taskerId)) {
      await Conversation.findByIdAndUpdate(conv._id, {
        $addToSet: { participants: task.taskerId },
      });
      conv = await Conversation.findById(conv._id)
        .populate('participants', 'name avatar')
        .lean();
    }
  }

  return res.status(201).json(new ApiResponse(201, conv));
});

export const getMessages = asyncHandler(async (req: Request, res: Response) => {
  const userId = getUserId(req);
  const { conversationId } = req.params;
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit = 40;

  const conv = await Conversation.findById(conversationId).lean();
  if (!conv) throw new ApiError(404, 'Conversation not found');

  const ids = conv.participants.map(String);
  if (!ids.includes(userId)) throw new ApiError(403, 'Forbidden');

  const [messages, total] = await Promise.all([
    Message.find({ conversationId })
      .populate('senderId', 'name avatar')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    Message.countDocuments({ conversationId }),
  ]);

  return res.json(new ApiResponse(200, { messages: messages.reverse(), total, page, pages: Math.ceil(total / limit) }));
});

export const markAsRead = asyncHandler(async (req: Request, res: Response) => {
  const userId = getUserId(req);
  const { conversationId } = req.params;

  await Message.updateMany(
    { conversationId, readBy: { $ne: userId } },
    { $addToSet: { readBy: userId } }
  );

  await Conversation.findByIdAndUpdate(conversationId, {
    $set: { [`unreadCount.${userId}`]: 0 },
  });

  return res.json(new ApiResponse(200, null, 'Marked as read'));
});
