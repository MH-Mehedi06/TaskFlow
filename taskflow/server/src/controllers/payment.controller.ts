import { Request, Response } from 'express';
import { Task } from '../models/Task';
import { TaskerProfile } from '../models/TaskerProfile';
import { User } from '../models/User';
import { asyncHandler } from '../utils/asyncHandler';
import { getUserId, getUserRole } from '../utils/requestHelpers';
import { ApiError } from '../utils/ApiError';
import { ApiResponse } from '../utils/ApiResponse';
import * as stripeService from '../services/stripe.service';
import { env } from '../config/env';
import { notifyPaymentReceived } from '../services/notification.service';
import { logger } from '../utils/logger';

// POST /api/payments/create-intent
export const createPaymentIntent = asyncHandler(async (req: Request, res: Response) => {
  const clientId = getUserId(req);
  const { taskId } = req.body;

  const task = await Task.findById(taskId);
  if (!task) throw new ApiError(404, 'Task not found');
  if (String(task.clientId) !== clientId) throw new ApiError(403, 'Access denied');
  if (!task.price) throw new ApiError(400, 'Task has no price — select a Tasker first');
  if (task.paymentStatus !== 'pending') throw new ApiError(400, 'Payment already processed for this task');

  const intent = await stripeService.createPaymentIntent(task.price, 'usd', {
    taskId: String(task._id),
    clientId,
  });

  task.paymentIntentId = intent.id;
  await task.save();

  res.json(
    new ApiResponse(
      200,
      {
        clientSecret: intent.client_secret,
        paymentIntentId: intent.id,
        amount: task.price,
        isMock: !stripeService.isStripeEnabled(),
      },
      'Payment intent created'
    )
  );
});

// POST /api/payments/confirm  — called after Stripe.js confirmCardPayment (or dev mock)
export const confirmPayment = asyncHandler(async (req: Request, res: Response) => {
  const clientId = getUserId(req);
  const { taskId } = req.body;

  const task = await Task.findById(taskId);
  if (!task) throw new ApiError(404, 'Task not found');
  if (String(task.clientId) !== clientId) throw new ApiError(403, 'Access denied');

  task.paymentStatus = 'held';
  await task.save();

  notifyPaymentReceived(String(task.clientId), String(task._id), task.title, task.price ?? 0).catch((err) => logger.warn('notifyPaymentReceived failed', err));

  res.json(new ApiResponse(200, { paymentStatus: 'held' }, 'Payment confirmed'));
});

// POST /api/payments/capture/:taskId  — called on task completion
export const capturePayment = asyncHandler(async (req: Request, res: Response) => {
  const userId = getUserId(req);
  const role = getUserRole(req);

  // Validate access before attempting the atomic update
  const existing = await Task.findById(req.params.taskId);
  if (!existing) throw new ApiError(404, 'Task not found');
  const isTasker = String(existing.taskerId) === userId;
  const isAdmin = role === 'admin';
  if (!isTasker && !isAdmin) throw new ApiError(403, 'Only the assigned Tasker or admin can capture payment');
  if (existing.paymentStatus !== 'held') throw new ApiError(400, 'No held payment to capture');

  // Atomically flip paymentStatus from 'held' → 'captured'.
  // If updateTaskStatus already captured it concurrently, this returns null and we bail out.
  const task = await Task.findOneAndUpdate(
    { _id: req.params.taskId, paymentStatus: 'held' },
    { paymentStatus: 'captured' },
    { new: true }
  );
  if (!task) throw new ApiError(409, 'Payment was already captured by another request');

  if (task.paymentIntentId) {
    await stripeService.capturePaymentIntent(task.paymentIntentId);
  }

  // Transfer earnings to tasker's Stripe Connect account
  if (task.taskerId && task.taskerEarnings) {
    const profile = await TaskerProfile.findOne({ userId: task.taskerId });
    if (profile?.stripeAccountId) {
      await stripeService.createTransfer(task.taskerEarnings, profile.stripeAccountId, {
        taskId: String(task._id),
      });
    }
  }

  res.json(new ApiResponse(200, task, 'Payment captured and earnings transferred'));
});

// POST /api/payments/refund/:taskId
export const refundPayment = asyncHandler(async (req: Request, res: Response) => {
  const role = getUserRole(req);
  const { amount } = req.body;

  const task = await Task.findById(req.params.taskId);
  if (!task) throw new ApiError(404, 'Task not found');
  if (role !== 'admin') throw new ApiError(403, 'Admin only');
  if (!['held', 'captured'].includes(task.paymentStatus)) throw new ApiError(400, 'No payment to refund');

  if (task.paymentIntentId) {
    await stripeService.refundPayment(task.paymentIntentId, amount);
  }

  task.paymentStatus = 'refunded';
  await task.save();

  res.json(new ApiResponse(200, task, 'Payment refunded'));
});

// POST /api/payments/connect/create  — tasker creates Stripe Connect account
export const createConnectAccount = asyncHandler(async (req: Request, res: Response) => {
  const userId = getUserId(req);

  const user = await User.findById(userId);
  if (!user) throw new ApiError(404, 'User not found');

  const profile = await TaskerProfile.findOne({ userId });
  if (!profile) throw new ApiError(404, 'Tasker profile not found');

  if (profile.stripeAccountId) {
    return res.json(new ApiResponse(200, { accountId: profile.stripeAccountId, alreadyExists: true }, 'Connect account already exists'));
  }

  const account = await stripeService.createConnectAccount(user.email);
  profile.stripeAccountId = account.id;
  await profile.save();

  res.json(new ApiResponse(201, { accountId: account.id }, 'Connect account created'));
});

// GET /api/payments/connect/link  — get Stripe Connect onboarding URL
export const getConnectOnboardingLink = asyncHandler(async (req: Request, res: Response) => {
  const userId = getUserId(req);

  const profile = await TaskerProfile.findOne({ userId });
  if (!profile?.stripeAccountId) throw new ApiError(400, 'Create a Connect account first');

  const returnUrl = `${env.CLIENT_URL}/tasker/dashboard?stripe=success`;
  const refreshUrl = `${env.CLIENT_URL}/tasker/dashboard?stripe=refresh`;

  const link = await stripeService.createAccountLink(profile.stripeAccountId, returnUrl, refreshUrl);

  res.json(new ApiResponse(200, { url: link.url, isMock: !stripeService.isStripeEnabled() }, 'Onboarding link created'));
});

// GET /api/payments/history
export const getPaymentHistory = asyncHandler(async (req: Request, res: Response) => {
  const userId = getUserId(req);
  const role = getUserRole(req);

  const filter =
    role === 'tasker'
      ? { taskerId: userId, paymentStatus: { $ne: 'pending' } }
      : { clientId: userId, paymentStatus: { $ne: 'pending' } };

  const tasks = await Task.find(filter)
    .populate('categoryId', 'name icon')
    .populate('clientId', 'name avatar')
    .populate('taskerId', 'name avatar')
    .sort({ updatedAt: -1 })
    .limit(50);

  res.json(new ApiResponse(200, tasks, 'Payment history fetched'));
});

// POST /api/payments/webhook  — raw body, Stripe signature verification
export const webhookHandler = asyncHandler(async (req: Request, res: Response) => {
  const sig = req.headers['stripe-signature'] as string;

  if (!env.STRIPE_WEBHOOK_SECRET || !sig) {
    res.json({ received: true });
    return;
  }

  let event;
  try {
    event = stripeService.constructWebhookEvent(req.body as Buffer, sig, env.STRIPE_WEBHOOK_SECRET);
  } catch {
    throw new ApiError(400, 'Webhook signature verification failed');
  }

  if (event.type === 'payment_intent.succeeded') {
    const intent = event.data.object as { metadata?: { taskId?: string } };
    if (intent.metadata?.taskId) {
      await Task.findByIdAndUpdate(intent.metadata.taskId, { paymentStatus: 'held' });
    }
  }

  if (event.type === 'payment_intent.payment_failed') {
    const intent = event.data.object as { metadata?: { taskId?: string } };
    if (intent.metadata?.taskId) {
      await Task.findByIdAndUpdate(intent.metadata.taskId, { paymentStatus: 'pending' });
    }
  }

  res.json({ received: true });
});
