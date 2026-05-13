import { Notification, NotificationType } from '../models/Notification';
import { User } from '../models/User';
import { getIo } from '../sockets/io';
import { notificationQueue } from '../queues/notification.queue';
import { env } from '../config/env';
import { logger } from '../utils/logger';

export interface CreateNotificationPayload {
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  link?: string;
}

export const createNotification = async (payload: CreateNotificationPayload) => {
  try {
    const notif = await Notification.create(payload);

    // Real-time socket push to the user's personal room
    const io = getIo();
    if (io) {
      io.to(`user:${payload.userId}`).emit('notification:new', notif);
    }

    // Queue email/push delivery
    const user = await User.findById(payload.userId).select('email phone fcmToken notifications').lean();
    if (!user) return notif;

    const baseUrl = env.CLIENT_URL;

    if (user.notifications?.email && user.email) {
      notificationQueue.add({
        type: 'email',
        emailTo: user.email,
        emailSubject: payload.title,
        emailHtml: `<p>${payload.body}</p>${payload.link ? `<p><a href="${baseUrl}${payload.link}">View</a></p>` : ''}`,
      }).catch((e) => logger.error('Email queue error:', e));
    }

    if (user.notifications?.push && user.fcmToken) {
      notificationQueue.add({
        type: 'push',
        fcmToken: user.fcmToken,
        pushTitle: payload.title,
        pushBody: payload.body,
        pushData: payload.link ? { link: payload.link } : undefined,
      }).catch((e) => logger.error('Push queue error:', e));
    }

    return notif;
  } catch (err) {
    logger.error('createNotification error:', err);
  }
};

// ── Convenience helpers ────────────────────────────────────────────────────

export const notifyTaskAssigned = (taskerId: string, taskId: string, taskTitle: string) =>
  createNotification({
    userId: taskerId,
    type: 'task_assigned',
    title: 'New task assigned',
    body: `You have been assigned: ${taskTitle}`,
    link: `/tasks/${taskId}`,
    data: { taskId },
  });

export const notifyTaskCompleted = (clientId: string, taskId: string, taskTitle: string) =>
  createNotification({
    userId: clientId,
    type: 'task_completed',
    title: 'Task completed',
    body: `${taskTitle} has been completed. Leave a review!`,
    link: `/tasks/${taskId}`,
    data: { taskId },
  });

export const notifyPaymentReceived = (userId: string, taskId: string, taskTitle: string, amount: number) =>
  createNotification({
    userId,
    type: 'payment_received',
    title: 'Payment received',
    body: `$${amount.toFixed(2)} held for: ${taskTitle}`,
    link: `/tasks/${taskId}`,
    data: { taskId, amount: String(amount) },
  });

export const notifyNewMessage = (recipientId: string, senderName: string, conversationId: string) =>
  createNotification({
    userId: recipientId,
    type: 'new_message',
    title: `New message from ${senderName}`,
    body: 'You have a new message',
    link: `/chat`,
    data: { conversationId },
  });

export const notifyBookingConfirmed = (clientId: string, taskId: string, taskTitle: string) =>
  createNotification({
    userId: clientId,
    type: 'booking_confirmed',
    title: 'Booking confirmed',
    body: `Your task has been booked: ${taskTitle}`,
    link: `/tasks/${taskId}`,
    data: { taskId },
  });

export const notifyReviewRequest = (userId: string, taskId: string) =>
  createNotification({
    userId,
    type: 'review_request',
    title: 'Leave a review',
    body: 'How did your task go? Share your experience.',
    link: `/tasks/${taskId}`,
    data: { taskId },
  });

export const notifyDisputeUpdate = (userId: string, disputeId: string, message: string) =>
  createNotification({
    userId,
    type: 'dispute_update',
    title: 'Dispute update',
    body: message,
    link: `/disputes/${disputeId}`,
    data: { disputeId },
  });
