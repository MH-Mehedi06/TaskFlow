import mongoose, { Document, Schema } from 'mongoose';

export interface ITaskApplication extends Document {
  taskId: mongoose.Types.ObjectId;
  taskerId: mongoose.Types.ObjectId;
  status: 'pending' | 'accepted' | 'rejected' | 'withdrawn';
  coverLetter: string;
  proposedRate: number;
}

const TaskApplicationSchema = new Schema<ITaskApplication>(
  {
    taskId: { type: Schema.Types.ObjectId, ref: 'Task', required: true },
    taskerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'rejected', 'withdrawn'],
      default: 'pending',
    },
    coverLetter: { type: String, required: true, trim: true, maxlength: 1000 },
    proposedRate: { type: Number, required: true, min: 1 },
  },
  { timestamps: true }
);

TaskApplicationSchema.index({ taskId: 1, taskerId: 1 }, { unique: true });
TaskApplicationSchema.index({ taskId: 1, status: 1 });
TaskApplicationSchema.index({ taskerId: 1, status: 1 });

export default mongoose.model<ITaskApplication>('TaskApplication', TaskApplicationSchema);
