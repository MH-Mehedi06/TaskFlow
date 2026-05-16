import { Request } from 'express';
import { ApiError } from './ApiError';

const assertUser = (req: Request) => {
  if (!req.user) throw new ApiError(401, 'Unauthorized');
  return req.user;
};

export const getUserId = (req: Request): string => String(assertUser(req)._id);
export const getUserRole = (req: Request): string => assertUser(req).role;
export const getUserName = (req: Request): string => assertUser(req).name;
