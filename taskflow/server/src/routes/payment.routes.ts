import { Router } from 'express';
import {
  createPaymentIntent,
  confirmPayment,
  capturePayment,
  refundPayment,
  createConnectAccount,
  getConnectOnboardingLink,
  getPaymentHistory,
  webhookHandler,
} from '../controllers/payment.controller';
import { requireAuth, requireRole } from '../middleware/auth.middleware';

const router = Router();

// Webhook must be first — raw body (configured in app.ts before JSON parser)
router.post('/webhook', webhookHandler);

router.use(requireAuth);

router.post('/create-intent', requireRole('client'), createPaymentIntent);
router.post('/confirm', requireRole('client'), confirmPayment);
router.post('/capture/:taskId', requireRole('tasker', 'admin'), capturePayment);
router.post('/refund/:taskId', requireRole('admin'), refundPayment);
router.get('/history', requireRole('client', 'tasker'), getPaymentHistory);
router.post('/connect/create', requireRole('tasker', 'admin'), createConnectAccount);
router.get('/connect/link', requireRole('tasker', 'admin'), getConnectOnboardingLink);

export default router;
