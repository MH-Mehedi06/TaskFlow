import mongoose, { Document, Schema } from 'mongoose';

export interface IReview extends Document {
  taskId: mongoose.Types.ObjectId;
  reviewerId: mongoose.Types.ObjectId;
  revieweeId: mongoose.Types.ObjectId;
  rating: number;
  comment: string;
  reply?: string;
  isApproved: boolean;
  aiModerationScore: number;
  aiModerationReason?: string;
  photos: string[];
}

const reviewSchema = new Schema<IReview>(
  {
    taskId: { type: Schema.Types.ObjectId, ref: 'Task', required: true, unique: true },
    reviewerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    revieweeId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, required: true, maxlength: 1000 },
    reply: { type: String },
    isApproved: { type: Boolean, default: false },
    aiModerationScore: { type: Number, default: 0 },
    aiModerationReason: { type: String },
    photos: [{ type: String }],
  },
  { timestamps: true }
);

reviewSchema.index({ revieweeId: 1 });
reviewSchema.index({ rating: -1 });
reviewSchema.index({ isApproved: 1 });
reviewSchema.index({ revieweeId: 1, isApproved: 1, createdAt: -1 });
reviewSchema.index({ isApproved: 1, createdAt: -1 });

reviewSchema.post('save', async function (doc) {
  if (!doc.isApproved) return;
  try {
    const { TaskerProfile } = await import('./TaskerProfile');
    const Review = mongoose.model<IReview>('Review');
    const [result] = await Review.aggregate<{ avg: number; count: number }>([
      { $match: { revieweeId: doc.revieweeId, isApproved: true } },
      { $group: { _id: null, avg: { $avg: '$rating' }, count: { $sum: 1 } } },
    ]);
    const avg = result?.avg ?? 0;
    const count = result?.count ?? 0;
    await TaskerProfile.findOneAndUpdate(
      { userId: doc.revieweeId },
      { avgRating: Math.round(avg * 10) / 10, totalReviews: count }
    );
  } catch { /* ignore */ }
});

export const Review = mongoose.model<IReview>('Review', reviewSchema);
