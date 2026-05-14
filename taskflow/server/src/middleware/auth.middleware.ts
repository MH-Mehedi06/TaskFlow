import { Request, Response, NextFunction } from 'express';
import passport from 'passport';
import { IUser } from '../models/User';
import { ApiError } from '../utils/ApiError';

export const requireAuth = (req: Request, res: Response, next: NextFunction): void => {
  passport.authenticate('jwt', { session: false }, (err: Error, user: IUser) => {
    if (err) return next(err);
    if (!user) return next(new ApiError(401, 'Unauthorized'));
    req.user = user;
    next();
  })(req, res, next);
};

export const requireRole = (...roles: string[]) =>
  (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) return next(new ApiError(401, 'Unauthorized'));
    const role = (req.user as unknown as IUser).role;
    if (!roles.includes(role)) return next(new ApiError(403, 'Forbidden'));
    next();
  };

export const optionalAuth = (req: Request, res: Response, next: NextFunction): void => {
  passport.authenticate('jwt', { session: false }, (_err: Error, user: IUser) => {
    if (user) req.user = user;
    next();
  })(req, res, next);
};
