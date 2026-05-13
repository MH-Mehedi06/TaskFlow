import { Router } from 'express';
import { body } from 'express-validator';
import {
  getCategories,
  getCategoryBySlug,
  createCategory,
  updateCategory,
  deleteCategory,
} from '../controllers/category.controller';
import { requireAuth, requireRole } from '../middleware/auth.middleware';
import { cacheResponse, httpCache } from '../middleware/cache.middleware';

const router = Router();

// Public: cache in Redis for 10 min + tell browser to cache for 5 min
router.get('/', httpCache(300), cacheResponse(600), getCategories);
router.get('/:slug', httpCache(300), cacheResponse(600), getCategoryBySlug);

router.post(
  '/',
  requireAuth,
  requireRole('admin'),
  [
    body('name').trim().notEmpty().withMessage('Name required'),
    body('startingPrice').optional().isNumeric().withMessage('Starting price must be a number'),
    body('parentId').optional().isMongoId().withMessage('Invalid parent ID'),
  ],
  createCategory
);

router.put('/:id', requireAuth, requireRole('admin'), updateCategory);
router.delete('/:id', requireAuth, requireRole('admin'), deleteCategory);

export default router;
