import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth.middleware';
import { upload } from '../middleware/upload.middleware';
import {
  createDispute,
  getMyDisputes,
  getDisputeById,
  uploadEvidence,
  updateDisputeStatus,
  resolveDispute,
} from '../controllers/dispute.controller';

const router = Router();

router.use(requireAuth);

router.get('/', getMyDisputes);
router.post('/', createDispute);
router.get('/:id', getDisputeById);
router.put('/:id/evidence', upload.array('files', 5), uploadEvidence);
router.put('/:id/status', requireRole('admin'), updateDisputeStatus);
router.post('/:id/resolve', requireRole('admin'), resolveDispute);

export default router;
