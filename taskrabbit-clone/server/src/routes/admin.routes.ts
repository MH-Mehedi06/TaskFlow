import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth.middleware';
import {
  getStats,
  getUsers,
  getUserById,
  updateUserRole,
  banUser,
  deleteUser,
  getAllTasks,
  assignTasker,
  getPendingReviews,
  moderateReview,
  getAllDisputes,
  resolveDispute,
  getAdminCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  getFinancials,
  getAdminTaskers,
  toggleEliteBadge,
  toggleBackgroundCheck,
  sendSystemNotification,
  getSettings,
  updateSettings,
  getRecentActivity,
  getAuditLog,
} from '../controllers/admin.controller';

const router = Router();

router.use(requireAuth, requireRole('admin'));

router.get('/stats', getStats);
router.get('/recent-activity', getRecentActivity);

router.get('/users', getUsers);
router.get('/users/:id', getUserById);
router.put('/users/:id/role', updateUserRole);
router.put('/users/:id/ban', banUser);
router.delete('/users/:id', deleteUser);

router.get('/tasks', getAllTasks);
router.put('/tasks/:id/assign', assignTasker);

router.get('/reviews/pending', getPendingReviews);
router.put('/reviews/:id/moderate', moderateReview);

router.get('/disputes', getAllDisputes);
router.put('/disputes/:id/resolve', resolveDispute);

router.get('/categories', getAdminCategories);
router.post('/categories', createCategory);
router.put('/categories/:id', updateCategory);
router.delete('/categories/:id', deleteCategory);

router.get('/financials', getFinancials);

router.get('/taskers', getAdminTaskers);
router.put('/taskers/:id/elite', toggleEliteBadge);
router.put('/taskers/:id/background-check', toggleBackgroundCheck);

router.post('/notifications/broadcast', sendSystemNotification);

router.get('/settings', getSettings);
router.put('/settings', updateSettings);

router.get('/audit-log', getAuditLog);

export default router;
