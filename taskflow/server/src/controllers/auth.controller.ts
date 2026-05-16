import { Request, Response } from 'express';
import jwt, { SignOptions } from 'jsonwebtoken';
import crypto from 'crypto';
import { validationResult } from 'express-validator';
import { User, IUser } from '../models/User';
import { TaskerProfile } from '../models/TaskerProfile';
import { redis } from '../config/redis';
import { env } from '../config/env';
import { emailService } from '../services/email.service';
import { asyncHandler } from '../utils/asyncHandler';
import { ApiError } from '../utils/ApiError';
import { ApiResponse } from '../utils/ApiResponse';
import { getUserId } from '../utils/requestHelpers';

const generateTokens = (userId: string) => {
  const accessToken = jwt.sign({ sub: userId }, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN,
  } as SignOptions);
  const refreshToken = jwt.sign({ sub: userId }, env.JWT_REFRESH_SECRET, {
    expiresIn: env.JWT_REFRESH_EXPIRES_IN,
  } as SignOptions);
  return { accessToken, refreshToken };
};

const setRefreshCookie = (res: Response, token: string) => {
  res.cookie('refreshToken', token, {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
};

export const register = asyncHandler(async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) throw new ApiError(422, 'Validation failed', errors.array());

  const { name, email, password, role, phone } = req.body;
  const existing = await User.findOne({ email });
  if (existing) throw new ApiError(409, 'Email already registered');

  const user = await User.create({
    name,
    email,
    passwordHash: password,
    role: role === 'tasker' ? 'tasker' : 'client',
    phone,
  });

  if (role === 'tasker') {
    await TaskerProfile.create({ userId: user._id });
  }

  // In dev mode, auto-verify so login works without SendGrid
  if (env.NODE_ENV === 'development') {
    user.isVerified = true;
    await user.save();
    res.status(201).json(new ApiResponse(201, { user: user.toPublicJSON() }, 'Registration successful. You can log in now.'));
    return;
  }

  const verifyToken = crypto.randomBytes(32).toString('hex');
  await redis.setex(`email_verify:${verifyToken}`, 86400, String(user._id));
  await emailService.sendVerificationEmail(email, verifyToken);

  res.status(201).json(new ApiResponse(201, { user: user.toPublicJSON() }, 'Registration successful. Check your email to verify.'));
});

export const login = asyncHandler(async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) throw new ApiError(422, 'Validation failed', errors.array());

  const { email, password } = req.body;
  const user = await User.findOne({ email });
  if (!user) throw new ApiError(401, 'Invalid credentials');
  if (!user.isActive) throw new ApiError(403, 'Account is suspended');
  if (!user.isVerified) throw new ApiError(403, 'Please verify your email first');

  const valid = await user.comparePassword(password);
  if (!valid) throw new ApiError(401, 'Invalid credentials');

  const { accessToken, refreshToken } = generateTokens(String(user._id));
  const hash = crypto.createHash('sha256').update(refreshToken).digest('hex');
  await redis.setex(`refresh:${user._id}`, 7 * 24 * 60 * 60, hash);

  setRefreshCookie(res, refreshToken);
  res.json(new ApiResponse(200, { accessToken, user: user.toPublicJSON() }, 'Login successful'));
});

export const logout = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user ? getUserId(req) : null;
  if (userId) await redis.del(`refresh:${userId}`);
  res.clearCookie('refreshToken');
  res.json(new ApiResponse(200, null, 'Logged out'));
});

export const refreshToken = asyncHandler(async (req: Request, res: Response) => {
  const token = req.cookies?.refreshToken;
  if (!token) throw new ApiError(401, 'No refresh token');

  let payload: jwt.JwtPayload;
  try {
    payload = jwt.verify(token, env.JWT_REFRESH_SECRET) as jwt.JwtPayload;
  } catch {
    throw new ApiError(401, 'Invalid refresh token');
  }

  const stored = await redis.get(`refresh:${payload.sub}`);
  if (!stored) throw new ApiError(401, 'Refresh token revoked');

  const incoming = crypto.createHash('sha256').update(token).digest('hex');
  if (incoming !== stored) throw new ApiError(401, 'Refresh token mismatch');

  const { accessToken, refreshToken: newRefresh } = generateTokens(payload.sub as string);
  const newHash = crypto.createHash('sha256').update(newRefresh).digest('hex');
  await redis.setex(`refresh:${payload.sub}`, 7 * 24 * 60 * 60, newHash);

  setRefreshCookie(res, newRefresh);
  res.json(new ApiResponse(200, { accessToken }, 'Token refreshed'));
});

export const verifyEmail = asyncHandler(async (req: Request, res: Response) => {
  const { token } = req.body;
  if (!token) throw new ApiError(400, 'Token required');

  const userId = await redis.get(`email_verify:${token}`);
  if (!userId) throw new ApiError(400, 'Invalid or expired token');

  await User.findByIdAndUpdate(userId, { isVerified: true });
  await redis.del(`email_verify:${token}`);

  res.json(new ApiResponse(200, null, 'Email verified successfully'));
});

export const forgotPassword = asyncHandler(async (req: Request, res: Response) => {
  const { email } = req.body;
  const user = await User.findOne({ email });
  if (!user) {
    // Don't reveal whether the email exists
    res.json(new ApiResponse(200, null, 'If that email exists, a reset link was sent'));
    return;
  }

  const token = crypto.randomBytes(32).toString('hex');
  await redis.setex(`pwd_reset:${token}`, 3600, String(user._id));
  await emailService.sendPasswordResetEmail(email, token);

  res.json(new ApiResponse(200, null, 'Password reset email sent'));
});

export const resetPassword = asyncHandler(async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) throw new ApiError(422, 'Validation failed', errors.array());

  const { token, password } = req.body;
  const userId = await redis.get(`pwd_reset:${token}`);
  if (!userId) throw new ApiError(400, 'Invalid or expired token');

  const user = await User.findById(userId);
  if (!user) throw new ApiError(404, 'User not found');

  user.passwordHash = password;
  await user.save();
  await redis.del(`pwd_reset:${token}`);

  res.json(new ApiResponse(200, null, 'Password reset successful'));
});

export const googleCallback = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw new ApiError(401, 'OAuth failed');

  const uid = getUserId(req);
  const { accessToken, refreshToken: rt } = generateTokens(uid);
  const hash = crypto.createHash('sha256').update(rt).digest('hex');
  await redis.setex(`refresh:${uid}`, 7 * 24 * 60 * 60, hash);

  setRefreshCookie(res, rt);
  res.redirect(`${env.CLIENT_URL}/dashboard?token=${accessToken}`);
});

export const getMe = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw new ApiError(401, 'Unauthorized');
  const user = await User.findById(getUserId(req)).select('-passwordHash');
  res.json(new ApiResponse(200, { user }, 'User profile'));
});
