import { Router } from 'express';
import { body } from 'express-validator';
import {
  createTask,
  getMyTasks,
  getMyTaskStats,
  getAvailableTasks,
  getTaskById,
  updateTask,
  updateTaskStatus,
  cancelTask,
  uploadTaskPhotos,
} from '../controllers/task.controller';
import {
  applyToTask,
  getApplications,
  checkMyApplication,
  acceptApplication,
  rejectApplication,
  withdrawApplication,
  getMyApplications,
} from '../controllers/application.controller';
import { requireAuth, requireRole } from '../middleware/auth.middleware';
import { upload } from '../middleware/upload.middleware';

const router = Router();

router.use(requireAuth);

router.post(
  '/',
  requireRole('client'),
  [
    body('categoryId').isMongoId().withMessage('Valid category required'),
    body('title').trim().notEmpty().withMessage('Title required'),
    body('description').trim().notEmpty().withMessage('Description required'),
    body('address').trim().notEmpty().withMessage('Address required'),
    body('scheduledAt').isISO8601().withMessage('Valid date required'),
    body('estimatedHours').optional().isFloat({ min: 0.5, max: 168 }).withMessage('Estimated hours must be between 0.5 and 168'),
  ],
  createTask
);

router.get('/stats', getMyTaskStats);
router.get('/my-applications', requireRole('tasker'), getMyApplications);
router.get('/', getMyTasks);
router.get('/available', requireRole('tasker'), getAvailableTasks);
router.get('/:id', getTaskById);
router.put('/:id', requireRole('client', 'tasker'), updateTask);
router.put('/:id/status', updateTaskStatus);
router.post('/:id/cancel', requireRole('client', 'tasker'), cancelTask);
router.post('/:id/photos', requireRole('client', 'tasker'), upload.array('photos', 5), uploadTaskPhotos);

// Application routes
router.post(
  '/:id/apply',
  requireRole('tasker'),
  [
    body('coverLetter').trim().notEmpty().withMessage('Cover letter is required').isLength({ max: 1000 }).withMessage('Max 1000 characters'),
    body('proposedRate').isFloat({ min: 1 }).withMessage('Proposed rate must be at least $1'),
  ],
  applyToTask
);
router.get('/:id/applications', requireRole('client', 'admin'), getApplications);
router.get('/:id/applications/mine', requireRole('tasker'), checkMyApplication);
router.delete('/:id/applications/mine', requireRole('tasker'), withdrawApplication);
router.post('/:id/applications/:applicationId/accept', requireRole('client'), acceptApplication);
router.post('/:id/applications/:applicationId/reject', requireRole('client'), rejectApplication);

export default router;
