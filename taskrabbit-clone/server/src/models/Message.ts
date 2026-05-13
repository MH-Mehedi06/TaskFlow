import mongoose, { Document, Schema } from 'mongoose';

export interface IMessage extends Document {
  conversationId: mongoose.Types.ObjectId;
  senderId: mongoose.Types.ObjectId;
  content: string;
  attachments: string[];
  readBy: mongoose.Types.ObjectId[];
  messageType: 'text' | 'image' | 'system';
}

const messageSchema = new Schema<IMessage>(
  {
    conversationId: { type: Schema.Types.ObjectId, ref: 'Conversation', required: true },
    senderId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    content: { type: String, default: '' },
    attachments: [{ type: String }],
    readBy: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    messageType: { type: String, enum: ['text', 'image', 'system'], default: 'text' },
  },
  { timestamps: true }
);

messageSchema.index({ conversationId: 1, createdAt: -1 });
messageSchema.index({ senderId: 1 });

export const Message = mongoose.model<IMessage>('Message', messageSchema);
