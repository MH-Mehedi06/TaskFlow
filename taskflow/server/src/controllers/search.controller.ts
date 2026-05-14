import { Request, Response } from 'express';
import { TaskerProfile, ITaskerProfile } from '../models/TaskerProfile';
import { Task } from '../models/Task';
import { Category } from '../models/Category';
import { asyncHandler } from '../utils/asyncHandler';
import { ApiError } from '../utils/ApiError';
import { ApiResponse } from '../utils/ApiResponse';
import { generateEmbedding, cosineSimilarity } from '../services/embedding.service';

type LeanTasker = { _id: unknown; userId: unknown; bio: string; headline: string; skills: unknown[]; hourlyRates: unknown[]; avgRating: number; totalReviews: number; totalTasksCompleted: number; embeddings: number[]; backgroundChecked: boolean; isElite: boolean; serviceRadius: number; portfolio: string[]; certifications: string[]; availability: unknown[] };
type PopulatedUser = { isVerified?: boolean; isActive?: boolean; isBanned?: boolean };

const isAccountVisible = (profile: LeanTasker): boolean => {
  const u = profile.userId as PopulatedUser | null;
  return !!(u?.isVerified && u?.isActive !== false && !u?.isBanned);
};

export const indexTaskerEmbedding = async (profileId: string, text: string): Promise<void> => {
  const vec = await generateEmbedding(text);
  await TaskerProfile.findByIdAndUpdate(profileId, { embeddings: vec });
};

// GET /api/search/taskers?q=...&page=1&limit=12
export const semanticSearchTaskers = asyncHandler(async (req: Request, res: Response) => {
  const { q, page = 1, limit = 12 } = req.query;
  if (!q || typeof q !== 'string' || q.trim().length < 2) throw new ApiError(400, 'Query must be at least 2 characters');

  const skip = (Number(page) - 1) * Number(limit);
  const lim = Number(limit);
  const seen = new Set<string>();
  const merged: LeanTasker[] = [];

  const push = (profiles: LeanTasker[]) => {
    for (const p of profiles) {
      const id = String(p._id);
      if (!seen.has(id)) { seen.add(id); merged.push(p); }
    }
  };

  // 1. MongoDB $text search (requires text index; graceful skip if index absent)
  try {
    const textMatches = await TaskerProfile.find(
      { $text: { $search: q } },
      { score: { $meta: 'textScore' } }
    )
      .populate('userId', 'name avatar isVerified isActive isBanned createdAt')
      .populate('skills', 'name slug icon')
      .sort({ score: { $meta: 'textScore' } })
      .limit(50)
      .lean() as unknown as LeanTasker[];
    push(textMatches);
  } catch { /* no text index yet */ }

  // 2. Category name match
  const catMatches = await Category.find({ name: { $regex: q, $options: 'i' } }).select('_id').lean();
  if (catMatches.length > 0) {
    const catIds = catMatches.map((c) => c._id);
    const catTaskers = await TaskerProfile.find({ skills: { $in: catIds } })
      .populate('userId', 'name avatar isVerified isActive isBanned createdAt')
      .populate('skills', 'name slug icon')
      .limit(50)
      .lean() as unknown as LeanTasker[];
    push(catTaskers);
  }

  // 3. Vector cosine similarity on stored embeddings
  const queryVec = await generateEmbedding(q.trim());
  const withVec = await TaskerProfile.find({ 'embeddings.0': { $exists: true } })
    .populate('userId', 'name avatar isVerified isActive isBanned createdAt')
    .populate('skills', 'name slug icon')
    .limit(500)
    .lean() as unknown as LeanTasker[];

  const vecScored = withVec
    .map((p) => ({ p, score: cosineSimilarity(queryVec, p.embeddings ?? []) }))
    .filter(({ score }) => score > 0.1)
    .sort((a, b) => b.score - a.score)
    .map(({ p }) => p);
  push(vecScored);

  // 4. Regex fallback if still empty
  if (merged.length === 0) {
    const re = new RegExp(q.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    const fallback = await TaskerProfile.find({ $or: [{ bio: re }, { headline: re }] })
      .populate('userId', 'name avatar isVerified isActive isBanned createdAt')
      .populate('skills', 'name slug icon')
      .limit(lim)
      .lean() as unknown as LeanTasker[];
    push(fallback);
  }

  const verified = merged.filter(isAccountVisible);
  const total = verified.length;
  const data = verified.slice(skip, skip + lim);

  res.json(new ApiResponse(200, { data, total, page: Number(page), limit: lim, totalPages: Math.ceil(total / lim), query: q }, 'Search results'));
});

// GET /api/search?q=...  (unified: taskers + tasks)
export const unifiedSearch = asyncHandler(async (req: Request, res: Response) => {
  const { q } = req.query;
  if (!q || typeof q !== 'string' || q.trim().length < 2) throw new ApiError(400, 'Query must be at least 2 characters');

  const re = new RegExp(q.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');

  const [rawTaskers, tasks, categories] = await Promise.all([
    TaskerProfile.find({ $or: [{ bio: re }, { headline: re }] })
      .populate('userId', 'name avatar isVerified isActive isBanned')
      .populate('skills', 'name slug icon')
      .limit(20)
      .lean() as unknown as Promise<LeanTasker[]>,
    Task.find({ $or: [{ title: re }, { description: re }], status: { $in: ['posted', 'assigned'] } })
      .populate('categoryId', 'name icon')
      .populate('clientId', 'name avatar')
      .limit(5)
      .lean(),
    Category.find({ name: re }).limit(5).lean(),
  ]);

  const taskers = rawTaskers.filter(isAccountVisible).slice(0, 5);
  res.json(new ApiResponse(200, { taskers, tasks, categories, query: q }, 'Search results'));
});

// POST /api/search/reindex  (admin: regenerate all embeddings)
export const reindexAllTaskers = asyncHandler(async (_req: Request, res: Response) => {
  const profiles = await TaskerProfile.find()
    .populate('skills', 'name')
    .lean() as unknown as (LeanTasker & { skills: { name: string }[] })[];

  let count = 0;
  for (const p of profiles) {
    const skillNames = (p.skills as unknown as { name: string }[]).map((s) => s.name);
    const text = [p.headline, p.bio, ...skillNames].filter(Boolean).join(' ');
    if (text.trim()) {
      const vec = await generateEmbedding(text);
      await TaskerProfile.findByIdAndUpdate(p._id, { embeddings: vec });
      count++;
    }
  }

  res.json(new ApiResponse(200, { indexed: count }, `Reindexed ${count} tasker profiles`));
});
