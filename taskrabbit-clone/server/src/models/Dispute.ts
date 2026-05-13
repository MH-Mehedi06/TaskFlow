import mongoose, { Document, Schema } from 'mongoose';

export interface IDispute extends Document {
  taskId: mongoose.Types.ObjectId;
  clientId: mongoose.Types.ObjectId;
  taskerId: mongoose.Types.ObjectId;
  raisedBy: mongoose.Types.ObjectId;
  reason: string;
  description: string;
  evidence: string[];
  status: 'open' | 'under_review' | 'resolved_refund' | 'resolved_release' | 'closed';
  adminId?: mongoose.Types.ObjectId;
  adminNotes?: string;
  aiSummary?: string;
  aiSuggestedResolution?: string;
  resolution?: 'full_refund' | 'partial_refund' | 'no_refund';
  refundAmount?: number;
}

const disputeSchema = new Schema<IDispute>(
  {
    taskId: { type: Schema.Types.ObjectId, ref: 'Task', required: true },
    clientId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    taskerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    raisedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    reason: { type: String, required: true },
    description: { type: String, required: true },
    evidence: [{ type: String }],
    status: {
      type: String,
      enum: ['open', 'under_review', 'resolved_refund', 'resolved_release', 'closed'],
      default: 'open',
    },
    adminId: { type: Schema.Types.ObjectId, ref: 'User' },
    adminNotes: { type: String },
    aiSummary: { type: String },
    aiSuggestedResolution: { type: String },
    resolution: { type: String, enum: ['full_refund', 'partial_refund', 'no_refund'] },
    refundAmount: { type: Number },
  },
  { timestamps: true }
);

disputeSchema.index({ taskId: 1 });
disputeSchema.index({ status: 1 });
disputeSchema.index({ clientId: 1 });
disputeSchema.index({ taskerId: 1 });

export const Dispute = mongoose.model<IDispute>('Dispute', disputeSchema);
