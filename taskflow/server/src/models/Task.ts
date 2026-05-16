import mongoose, { Document, Schema } from 'mongoose';

export type TaskStatus = 'draft' | 'posted' | 'assigned' | 'in_progress' | 'completed' | 'cancelled';
export type PaymentStatus = 'pending' | 'held' | 'captured' | 'refunded';

export interface ITask extends Document {
  clientId: mongoose.Types.ObjectId;
  taskerId?: mongoose.Types.ObjectId;
  categoryId: mongoose.Types.ObjectId;
  title: string;
  description: string;
  photos: string[];
  status: TaskStatus;
  scheduledAt: Date;
  address: string;
  location?: { type: 'Point'; coordinates: [number, number] };
  estimatedHours?: number;
  price?: number;
  platformFee?: number;
  taskerEarnings?: number;
  paymentIntentId?: string;
  paymentStatus: PaymentStatus;
  isRated: boolean;
  cancellationReason?: string;
  notes?: string;
}

const taskSchema = new Schema<ITask>(
  {
    clientId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    taskerId: { type: Schema.Types.ObjectId, ref: 'User' },
    categoryId: { type: Schema.Types.ObjectId, ref: 'Category', required: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true },
    photos: [{ type: String }],
    status: { type: String, enum: ['draft', 'posted', 'assigned', 'in_progress', 'completed', 'cancelled'], default: 'draft' },
    scheduledAt: { type: Date, required: true },
    address: { type: String, required: true },
    location: {
      type: { type: String, enum: ['Point'] },
      coordinates: [Number],
    },
    estimatedHours: { type: Number, min: 0.5, max: 168 },
    price: { type: Number, min: 0 },
    platformFee: { type: Number, min: 0 },
    taskerEarnings: { type: Number, min: 0 },
    paymentIntentId: { type: String },
    paymentStatus: { type: String, enum: ['pending', 'held', 'captured', 'refunded'], default: 'pending' },
    isRated: { type: Boolean, default: false },
    cancellationReason: { type: String },
    notes: { type: String },
  },
  { timestamps: true }
);

taskSchema.index({ clientId: 1 });
taskSchema.index({ taskerId: 1 });
taskSchema.index({ status: 1 });
taskSchema.index({ title: 'text', description: 'text' }, { name: 'task_text', weights: { title: 3, description: 1 } });
taskSchema.index({ location: '2dsphere' }, { sparse: true });
taskSchema.index({ scheduledAt: -1 });
taskSchema.index({ status: 1, clientId: 1, scheduledAt: -1 });
taskSchema.index({ status: 1, taskerId: 1, scheduledAt: 1 });

export const Task = mongoose.model<ITask>('Task', taskSchema);
