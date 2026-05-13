import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import { Category } from '../models/Category';
import { asyncHandler } from '../utils/asyncHandler';
import { ApiError } from '../utils/ApiError';
import { ApiResponse } from '../utils/ApiResponse';
import { invalidateCache } from '../middleware/cache.middleware';

const CATEGORY_CACHE_GLOB = '/api/categories*';

export const getCategories = asyncHandler(async (_req: Request, res: Response) => {
  const [parents, allChildren] = await Promise.all([
    Category.find({ parentId: null, isActive: true }).sort({ sortOrder: 1, name: 1 }).lean(),
    Category.find({ parentId: { $ne: null }, isActive: true }).sort({ sortOrder: 1, name: 1 }).lean(),
  ]);

  const result = parents.map((parent) => ({
    ...parent,
    children: allChildren.filter((c) => String(c.parentId) === String(parent._id)),
  }));

  res.json(new ApiResponse(200, result, 'Categories fetched'));
});

export const getCategoryBySlug = asyncHandler(async (req: Request, res: Response) => {
  const { slug } = req.params;
  const [category, children] = await Promise.all([
    Category.findOne({ slug, isActive: true }).lean(),
    Category.find({ isActive: true }).sort({ sortOrder: 1 }).lean(),
  ]);
  if (!category) throw new ApiError(404, 'Category not found');

  res.json(new ApiResponse(200, {
    ...category,
    children: children.filter((c) => String(c.parentId) === String(category._id)),
  }, 'Category fetched'));
});

export const createCategory = asyncHandler(async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) throw new ApiError(422, 'Validation failed', errors.array());

  const category = await Category.create(req.body);
  invalidateCache(CATEGORY_CACHE_GLOB).catch(() => {});
  res.status(201).json(new ApiResponse(201, category, 'Category created'));
});

export const updateCategory = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const category = await Category.findByIdAndUpdate(id, req.body, { new: true, runValidators: true }).lean();
  if (!category) throw new ApiError(404, 'Category not found');
  invalidateCache(CATEGORY_CACHE_GLOB).catch(() => {});
  res.json(new ApiResponse(200, category, 'Category updated'));
});

export const deleteCategory = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const category = await Category.findByIdAndUpdate(id, { isActive: false }, { new: true }).lean();
  if (!category) throw new ApiError(404, 'Category not found');
  invalidateCache(CATEGORY_CACHE_GLOB).catch(() => {});
  res.json(new ApiResponse(200, null, 'Category deactivated'));
});
