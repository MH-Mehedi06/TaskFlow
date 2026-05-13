import { Router } from 'express';
import { body } from 'express-validator';
import {
  getTaskers,
  getMyProfile,
  getTaskerById,
  updateMyProfile,
  updateAvailability,
  uploadAvatar,
  uploadPortfolioImage,
  deletePortfolioImage,
} from '../controllers/tasker.controller';
import { semanticSearchTaskers } from '../controllers/search.controller';
import { requireAuth, requireRole } from '../middleware/auth.middleware';
import { upload } from '../middleware/upload.middleware';
import { cacheResponse, httpCache } from '../middleware/cache.middleware';

const router = Router();

// Public browse: cache 2 min in Redis, 1 min in browser
router.get('/', httpCache(60), cacheResponse(120), getTaskers);
router.get('/search', semanticSearchTaskers);
router.get('/semantic-search', semanticSearchTaskers);
router.get('/me', requireAuth, requireRole('tasker'), getMyProfile);
router.get('/:id', getTaskerById);

router.put(
  '/me/profile',
  requireAuth,
  requireRole('tasker'),
  [
    body('headline').optional().isLength({ max: 100 }).withMessage('Headline max 100 characters'),
    body('bio').optional().isLength({ max: 1000 }).withMessage('Bio max 1000 characters'),
    body('serviceRadius').optional().isNumeric().withMessage('Service radius must be a number'),
  ],
  updateMyProfile
);

router.put('/me/availability', requireAuth, requireRole('tasker'), updateAvailability);
router.post('/me/avatar', requireAuth, upload.single('avatar'), uploadAvatar);
router.post('/me/portfolio', requireAuth, requireRole('tasker'), upload.single('image'), uploadPortfolioImage);
router.delete('/me/portfolio', requireAuth, requireRole('tasker'), deletePortfolioImage);

export default router;
