import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth.middleware';
import {
  createReview,
  getReviewsByUser,
  getReviewByTask,
  replyToReview,
  approveReview,
  getPendingReviews,
} from '../controllers/review.controller';

const router = Router();

router.get('/pending', requireAuth, requireRole('admin'), getPendingReviews);
router.get('/user/:userId', getReviewsByUser);
router.get('/task/:taskId', getReviewByTask);
router.post('/', requireAuth, requireRole('client'), createReview);
router.put('/:id/reply', requireAuth, requireRole('tasker'), replyToReview);
router.put('/:id/approve', requireAuth, requireRole('admin'), approveReview);

export default router;
