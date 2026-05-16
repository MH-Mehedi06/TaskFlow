import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import { TaskerProfile } from '../models/TaskerProfile';
import { User, IUser } from '../models/User';
import { asyncHandler } from '../utils/asyncHandler';
import { getUserId } from '../utils/requestHelpers';
import { ApiError } from '../utils/ApiError';
import { ApiResponse } from '../utils/ApiResponse';
import { uploadBuffer } from '../services/cloudinary.service';
import { indexTaskerEmbedding } from './search.controller';
import { invalidateCache } from '../middleware/cache.middleware';
import { logger } from '../utils/logger';

export const getTaskers = asyncHandler(async (req: Request, res: Response) => {
  const { category, minRating, maxRate, page = 1, limit = 12 } = req.query;

  // Only show taskers whose accounts are verified, active, and not banned
  const verifiedUserIds = await User.find(
    { isVerified: true, isActive: true, isBanned: false },
    '_id'
  ).lean();

  const filter: Record<string, unknown> = {
    userId: { $in: verifiedUserIds.map((u) => u._id) },
  };
  if (category) filter.skills = category;
  if (minRating) filter.avgRating = { $gte: Number(minRating) };
  if (maxRate) filter.hourlyRates = { $elemMatch: { rate: { $lte: Number(maxRate) } } };

  const skip = (Number(page) - 1) * Number(limit);
  const [taskers, total] = await Promise.all([
    TaskerProfile.find(filter)
      .populate('userId', 'name avatar isVerified createdAt')
      .populate('skills', 'name slug icon')
      .sort({ avgRating: -1, totalTasksCompleted: -1 })
      .skip(skip)
      .limit(Number(limit))
      .lean(),
    TaskerProfile.countDocuments(filter),
  ]);

  res.json(
    new ApiResponse(
      200,
      { data: taskers, total, page: Number(page), limit: Number(limit), totalPages: Math.ceil(total / Number(limit)) },
      'Taskers fetched'
    )
  );
});

export const getMyProfile = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw new ApiError(401, 'Unauthorized');
  const userId = getUserId(req);
  const profile = await TaskerProfile.findOne({ userId })
    .populate('userId', 'name email avatar phone isVerified')
    .populate('skills', 'name slug icon');
  if (!profile) throw new ApiError(404, 'Profile not found');
  res.json(new ApiResponse(200, profile, 'Profile fetched'));
});

export const getTaskerById = asyncHandler(async (req: Request, res: Response) => {
  const profile = await TaskerProfile.findById(req.params.id)
    .populate('userId', 'name avatar isVerified isActive isBanned createdAt')
    .populate('skills', 'name slug icon startingPrice');
  if (!profile) throw new ApiError(404, 'Tasker not found');
  const user = profile.userId as unknown as (IUser & { isBanned?: boolean }) | null;
  if (!user?.isVerified || !user?.isActive || user?.isBanned) {
    throw new ApiError(404, 'Tasker not found');
  }
  res.json(new ApiResponse(200, profile, 'Tasker fetched'));
});

export const updateMyProfile = asyncHandler(async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) throw new ApiError(422, 'Validation failed', errors.array());
  if (!req.user) throw new ApiError(401, 'Unauthorized');

  const userId = getUserId(req);
  const { bio, headline, skills, hourlyRates, serviceRadius, certifications } = req.body;

  const profile = await TaskerProfile.findOneAndUpdate(
    { userId },
    { $set: { bio, headline, skills, hourlyRates, serviceRadius, certifications } },
    { new: true, upsert: true }
  ).populate('skills', 'name slug icon');

  if (!profile) throw new ApiError(500, 'Failed to save profile');

  // Regenerate embedding + invalidate public caches in background (non-blocking)
  const skillNames = (profile.skills as unknown as { name: string }[]).map((s) => s.name);
  const embeddingText = [profile.headline, profile.bio, ...skillNames].filter(Boolean).join(' ');
  if (embeddingText.trim()) {
    indexTaskerEmbedding(String(profile._id), embeddingText).catch((err) => logger.warn('indexTaskerEmbedding failed', err));
  }
  invalidateCache('/api/taskers*').catch((err) => logger.warn('invalidateCache failed', err));

  res.json(new ApiResponse(200, profile, 'Profile updated'));
});

export const updateAvailability = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw new ApiError(401, 'Unauthorized');
  const userId = getUserId(req);
  const { availability } = req.body;

  const profile = await TaskerProfile.findOneAndUpdate(
    { userId },
    { $set: { availability } },
    { new: true, upsert: true }
  );
  if (!profile) throw new ApiError(500, 'Failed to save availability');
  res.json(new ApiResponse(200, profile, 'Availability updated'));
});

export const uploadAvatar = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw new ApiError(401, 'Unauthorized');
  const userId = getUserId(req);
  const { base64 } = req.body;
  if (!base64 || typeof base64 !== 'string') throw new ApiError(400, 'No image provided');

  // Strip the data URL prefix (e.g. "data:image/jpeg;base64,") to get raw base64
  const raw = base64.includes(',') ? base64.split(',')[1] : base64;
  const buffer = Buffer.from(raw, 'base64');

  const url = await uploadBuffer(buffer, 'avatars', `user_${userId}`);
  await User.findByIdAndUpdate(userId, { avatar: url });
  res.json(new ApiResponse(200, { avatar: url }, 'Avatar uploaded'));
});

export const uploadPortfolioImage = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw new ApiError(401, 'Unauthorized');
  if (!req.file) throw new ApiError(400, 'No file uploaded');
  const userId = getUserId(req);

  const url = await uploadBuffer(req.file.buffer, 'portfolio', `${userId}_${Date.now()}`);
  const profile = await TaskerProfile.findOneAndUpdate(
    { userId },
    { $push: { portfolio: url } },
    { new: true }
  );
  if (!profile) throw new ApiError(404, 'Profile not found');
  res.json(new ApiResponse(200, { portfolio: profile.portfolio }, 'Image uploaded'));
});

export const deletePortfolioImage = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw new ApiError(401, 'Unauthorized');
  const userId = getUserId(req);
  const { url } = req.body;

  const profile = await TaskerProfile.findOneAndUpdate(
    { userId },
    { $pull: { portfolio: url } },
    { new: true }
  );
  if (!profile) throw new ApiError(404, 'Profile not found');
  res.json(new ApiResponse(200, { portfolio: profile.portfolio }, 'Image removed'));
});
