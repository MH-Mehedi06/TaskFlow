import mongoose, { Document, Schema } from 'mongoose';

export interface ITaskerProfile extends Document {
  userId: mongoose.Types.ObjectId;
  bio: string;
  headline: string;
  skills: mongoose.Types.ObjectId[];
  hourlyRates: { categoryId: mongoose.Types.ObjectId; rate: number }[];
  serviceRadius: number;
  backgroundChecked: boolean;
  isElite: boolean;
  stripeAccountId?: string;
  portfolio: string[];
  certifications: string[];
  availability: { day: number; slots: { start: string; end: string }[] }[];
  avgRating: number;
  totalReviews: number;
  totalTasksCompleted: number;
  embeddings: number[];
}

const taskerProfileSchema = new Schema<ITaskerProfile>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    bio: { type: String, maxlength: 1000, default: '' },
    headline: { type: String, maxlength: 100, default: '' },
    skills: [{ type: Schema.Types.ObjectId, ref: 'Category' }],
    hourlyRates: [{ categoryId: { type: Schema.Types.ObjectId, ref: 'Category' }, rate: Number }],
    serviceRadius: { type: Number, default: 25 },
    backgroundChecked: { type: Boolean, default: false },
    isElite: { type: Boolean, default: false },
    stripeAccountId: { type: String },
    portfolio: [{ type: String }],
    certifications: [{ type: String }],
    availability: [{
      day: { type: Number, min: 0, max: 6 },
      slots: [{ start: String, end: String }],
    }],
    avgRating: { type: Number, default: 0, min: 0, max: 5 },
    totalReviews: { type: Number, default: 0 },
    totalTasksCompleted: { type: Number, default: 0 },
    embeddings: [{ type: Number }],
  },
  { timestamps: true }
);

taskerProfileSchema.index({ userId: 1 }, { unique: true });
taskerProfileSchema.index({ skills: 1 });
taskerProfileSchema.index({ avgRating: -1 });
taskerProfileSchema.index({ bio: 'text', headline: 'text' }, { name: 'tasker_text', weights: { headline: 2, bio: 1 } });

export const TaskerProfile = mongoose.model<ITaskerProfile>('TaskerProfile', taskerProfileSchema);
