import { Router } from 'express';
import { body } from 'express-validator';
import rateLimit from 'express-rate-limit';
import passport from 'passport';
import {
  register,
  login,
  logout,
  refreshToken,
  verifyEmail,
  forgotPassword,
  resetPassword,
  googleCallback,
  getMe,
} from '../controllers/auth.controller';
import { requireAuth } from '../middleware/auth.middleware';

const router = Router();

const authLimiter = process.env.NODE_ENV === 'production'
  ? rateLimit({
      windowMs: 15 * 60 * 1000,
      max: 50,
      message: { success: false, message: 'Too many attempts, try again in 15 minutes.' },
    })
  : (_req: import('express').Request, _res: import('express').Response, next: import('express').NextFunction) => next();

router.post(
  '/register',
  [
    body('name').trim().isLength({ min: 2 }).withMessage('Name must be at least 2 characters'),
    body('email').isEmail().trim().toLowerCase().withMessage('Valid email required'),
    body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
    body('role').optional({ checkFalsy: true }).isIn(['client', 'tasker']),
    body('phone').optional({ checkFalsy: true }).isMobilePhone('any'),
  ],
  register
);

router.post(
  '/login',
  authLimiter,
  [
    body('email').isEmail().trim().toLowerCase(),
    body('password').notEmpty(),
  ],
  login
);

router.post('/logout', requireAuth, logout);
router.post('/refresh-token', refreshToken);

router.post(
  '/verify-email',
  [body('token').notEmpty().withMessage('Token required')],
  verifyEmail
);

router.post(
  '/forgot-password',
  authLimiter,
  [body('email').isEmail().normalizeEmail()],
  forgotPassword
);

router.post(
  '/reset-password',
  [
    body('token').notEmpty(),
    body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  ],
  resetPassword
);

router.get(
  '/google',
  passport.authenticate('google', { scope: ['profile', 'email'], session: false })
);

router.get(
  '/google/callback',
  passport.authenticate('google', { session: false, failureRedirect: '/login' }),
  googleCallback
);

router.get('/me', requireAuth, getMe);

export default router;
