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
router.post('/capture/:taskId', capturePayment);
router.post('/refund/:taskId', requireRole('admin'), refundPayment);
router.get('/history', getPaymentHistory);
router.post('/connect/create', requireRole('tasker'), createConnectAccount);
router.get('/connect/link', requireRole('tasker'), getConnectOnboardingLink);

export default router;
