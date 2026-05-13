import { Request, Response } from 'express';
import { Review } from '../models/Review';
import { Task } from '../models/Task';
import { IUser } from '../models/User';
import { asyncHandler } from '../utils/asyncHandler';
import { ApiResponse } from '../utils/ApiResponse';
import { ApiError } from '../utils/ApiError';
import { notifyReviewRequest } from '../services/notification.service';
import { env } from '../config/env';

const uid = (u: Express.User) => String((u as unknown as IUser)._id);

// ── AI moderation (lightweight — real AI lives in Step 12) ─────────────────
async function moderateReview(comment: string): Promise<{ score: number; reason: string; approved: boolean }> {
  const profanity = ['spam', 'fake', 'scam', 'fraud', 'terrible fake'];
  const lower = comment.toLowerCase();
  const hasProfanity = profanity.some((w) => lower.includes(w));

  if (!env.OPENAI_API_KEY) {
    // In dev: auto-approve unless obvious spam keywords
    return { score: hasProfanity ? 0.2 : 0.95, reason: hasProfanity ? 'Potential spam detected' : 'Auto-approved (dev)', approved: !hasProfanity };
  }

  try {
    const { default: OpenAI } = await import('openai');
    const openai = new OpenAI({ apiKey: env.OPENAI_API_KEY });
    const resp = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are a review moderation assistant. Analyse the review and return JSON: { "score": 0.0-1.0, "reason": "brief reason", "approved": true/false }. Approve if genuine; reject if spam, fake, or abusive.',
        },
        { role: 'user', content: `Review: "${comment}"` },
      ],
      response_format: { type: 'json_object' },
      max_tokens: 100,
    });
    return JSON.parse(resp.choices[0].message.content ?? '{"score":0.8,"reason":"AI check","approved":true}');
  } catch {
    return { score: 0.8, reason: 'AI unavailable — default approved', approved: true };
  }
}

// POST /api/reviews
export const createReview = asyncHandler(async (req: Request, res: Response) => {
  const reviewerId = uid(req.user!);
  const { taskId, rating, comment, photos } = req.body;

  if (!taskId || !rating || !comment) throw new ApiError(400, 'taskId, rating, and comment are required');
  if (rating < 1 || rating > 5) throw new ApiError(400, 'Rating must be 1-5');

  const task = await Task.findById(taskId).lean();
  if (!task) throw new ApiError(404, 'Task not found');
  if (task.status !== 'completed') throw new ApiError(400, 'Can only review completed tasks');

  const isClient = String(task.clientId) === reviewerId;
  if (!isClient) throw new ApiError(403, 'Only the client can leave a review');

  const exists = await Review.findOne({ taskId }).lean();
  if (exists) throw new ApiError(409, 'A review already exists for this task');

  const revieweeId = String(task.taskerId);
  const moderation = await moderateReview(comment);

  const review = await Review.create({
    taskId,
    reviewerId,
    revieweeId,
    rating,
    comment,
    photos: photos ?? [],
    isApproved: moderation.approved,
    aiModerationScore: moderation.score,
    aiModerationReason: moderation.reason,
  });

  if (moderation.approved) {
    notifyReviewRequest(revieweeId, taskId).catch(() => null);
  }

  return res.status(201).json(new ApiResponse(201, review, 'Review submitted'));
});

// GET /api/reviews/user/:userId  — approved reviews for a tasker's public profile
export const getReviewsByUser = asyncHandler(async (req: Request, res: Response) => {
  const { userId } = req.params;
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit = 10;

  const [reviews, total] = await Promise.all([
    Review.find({ revieweeId: userId, isApproved: true })
      .populate('reviewerId', 'name avatar')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    Review.countDocuments({ revieweeId: userId, isApproved: true }),
  ]);

  const avg = reviews.length
    ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length
    : 0;

  return res.json(new ApiResponse(200, { reviews, total, avg, page, pages: Math.ceil(total / limit) }));
});

// GET /api/reviews/task/:taskId
export const getReviewByTask = asyncHandler(async (req: Request, res: Response) => {
  const review = await Review.findOne({ taskId: req.params.taskId })
    .populate('reviewerId', 'name avatar')
    .populate('revieweeId', 'name avatar')
    .lean();

  return res.json(new ApiResponse(200, review));
});

// PUT /api/reviews/:id/reply  — tasker replies
export const replyToReview = asyncHandler(async (req: Request, res: Response) => {
  const taskerId = uid(req.user!);
  const { reply } = req.body;
  if (!reply?.trim()) throw new ApiError(400, 'Reply text required');

  const review = await Review.findById(req.params.id).lean();
  if (!review) throw new ApiError(404, 'Review not found');
  if (String(review.revieweeId) !== taskerId) throw new ApiError(403, 'Forbidden');

  const updated = await Review.findByIdAndUpdate(req.params.id, { reply }, { new: true }).lean();
  return res.json(new ApiResponse(200, updated));
});

// PUT /api/reviews/:id/approve  — admin
export const approveReview = asyncHandler(async (req: Request, res: Response) => {
  const { approved } = req.body;
  const review = await Review.findByIdAndUpdate(req.params.id, { isApproved: !!approved }, { new: true });
  if (!review) throw new ApiError(404, 'Review not found');
  if (approved) await review.save(); // triggers post-save hook to update tasker avg rating
  return res.json(new ApiResponse(200, review));
});

// GET /api/reviews/pending  — admin: reviews awaiting moderation
export const getPendingReviews = asyncHandler(async (req: Request, res: Response) => {
  const reviews = await Review.find({ isApproved: false })
    .populate('reviewerId', 'name avatar')
    .populate('revieweeId', 'name avatar')
    .populate('taskId', 'title')
    .sort({ createdAt: -1 })
    .lean();
  return res.json(new ApiResponse(200, reviews));
});
