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
import { requireAuth, requireRole } from '../middleware/auth.middleware';
import { upload } from '../middleware/upload.middleware';

const router = Router();

router.use(requireAuth);

router.post(
  '/',
  requireRole('client', 'tasker'),
  [
    body('categoryId').isMongoId().withMessage('Valid category required'),
    body('title').trim().notEmpty().withMessage('Title required'),
    body('description').trim().notEmpty().withMessage('Description required'),
    body('address').trim().notEmpty().withMessage('Address required'),
    body('scheduledAt').isISO8601().withMessage('Valid date required'),
  ],
  createTask
);

router.get('/stats', getMyTaskStats);
router.get('/', getMyTasks);
router.get('/available', requireRole('tasker'), getAvailableTasks);
router.get('/:id', getTaskById);
router.put('/:id', requireRole('client', 'tasker'), updateTask);
router.put('/:id/status', updateTaskStatus);
router.post('/:id/cancel', requireRole('client', 'tasker'), cancelTask);
router.post('/:id/photos', requireRole('client', 'tasker'), upload.array('photos', 5), uploadTaskPhotos);

export default router;
