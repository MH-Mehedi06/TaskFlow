import mongoose, { Document, Schema } from 'mongoose';

export type NotificationType =
  | 'booking_confirmed'
  | 'task_assigned'
  | 'task_completed'
  | 'payment_received'
  | 'new_message'
  | 'review_request'
  | 'dispute_update'
  | 'system';

export interface INotification extends Document {
  userId: mongoose.Types.ObjectId;
  type: NotificationType;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  isRead: boolean;
  link?: string;
}

const notificationSchema = new Schema<INotification>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    type: {
      type: String,
      enum: [
        'booking_confirmed',
        'task_assigned',
        'task_completed',
        'payment_received',
        'new_message',
        'review_request',
        'dispute_update',
        'system',
      ],
      required: true,
    },
    title: { type: String, required: true },
    body: { type: String, required: true },
    data: { type: Schema.Types.Mixed },
    isRead: { type: Boolean, default: false },
    link: { type: String },
  },
  { timestamps: true }
);

notificationSchema.index({ userId: 1 });
notificationSchema.index({ isRead: 1 });
notificationSchema.index({ createdAt: -1 });
notificationSchema.index({ userId: 1, isRead: 1, createdAt: -1 });

export const Notification = mongoose.model<INotification>('Notification', notificationSchema);
