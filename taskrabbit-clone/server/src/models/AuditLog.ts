import mongoose, { Document, Schema } from 'mongoose';

export type AuditAction =
  | 'ban_user' | 'unban_user' | 'delete_user' | 'update_role'
  | 'resolve_dispute'
  | 'approve_review' | 'reject_review'
  | 'create_category' | 'update_category' | 'delete_category'
  | 'grant_elite' | 'revoke_elite' | 'grant_bg_check' | 'revoke_bg_check'
  | 'update_settings'
  | 'broadcast_notification'
  | 'assign_tasker';

export interface IAuditLog extends Document {
  adminId: mongoose.Types.ObjectId;
  adminName: string;
  action: AuditAction;
  targetType: 'user' | 'dispute' | 'review' | 'category' | 'tasker' | 'settings' | 'notification' | 'task';
  targetId?: string;
  targetLabel?: string;
  details?: string;
  ip?: string;
}

const auditLogSchema = new Schema<IAuditLog>(
  {
    adminId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    adminName: { type: String, required: true },
    action: { type: String, required: true },
    targetType: { type: String, required: true },
    targetId: { type: String },
    targetLabel: { type: String },
    details: { type: String },
    ip: { type: String },
  },
  { timestamps: true }
);

auditLogSchema.index({ createdAt: -1 });
auditLogSchema.index({ adminId: 1 });
auditLogSchema.index({ action: 1 });
auditLogSchema.index({ targetType: 1 });

export const AuditLog = mongoose.model<IAuditLog>('AuditLog', auditLogSchema);
