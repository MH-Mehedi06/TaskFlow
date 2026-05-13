import mongoose, { Document, Schema } from 'mongoose';

export interface IConversation extends Document {
  taskId: mongoose.Types.ObjectId;
  participants: mongoose.Types.ObjectId[];
  lastMessage?: { content: string; senderId: mongoose.Types.ObjectId; createdAt: Date };
  unreadCount: Map<string, number>;
}

const conversationSchema = new Schema<IConversation>(
  {
    taskId: { type: Schema.Types.ObjectId, ref: 'Task', required: true, unique: true },
    participants: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    lastMessage: {
      content: String,
      senderId: { type: Schema.Types.ObjectId, ref: 'User' },
      createdAt: Date,
    },
    unreadCount: { type: Map, of: Number, default: new Map() },
  },
  { timestamps: true }
);

conversationSchema.index({ taskId: 1 }, { unique: true });
conversationSchema.index({ participants: 1 });

export const Conversation = mongoose.model<IConversation>('Conversation', conversationSchema);
