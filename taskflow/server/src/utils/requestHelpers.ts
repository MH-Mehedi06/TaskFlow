import { Request } from 'express';

export const getUserId = (req: Request): string => String(req.user!._id);
export const getUserRole = (req: Request): string => req.user!.role;
export const getUserName = (req: Request): string => req.user!.name;
