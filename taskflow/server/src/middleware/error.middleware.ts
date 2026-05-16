import { Request, Response, NextFunction } from 'express';
import { ApiError } from '../utils/ApiError';
import { logger } from '../utils/logger';

export const errorHandler = (err: Error, req: Request, res: Response, _next: NextFunction): void => {
  logger.error(err.message, err.stack);

  if (err instanceof ApiError) {
    res.status(err.statusCode).json({
      success: false,
      message: err.message,
      errors: err.errors,
    });
    return;
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    res.status(422).json({
      success: false,
      message: 'Validation failed',
      errors: [err.message],
    });
    return;
  }

  // Mongoose cast error (e.g. invalid ObjectId)
  if (err.name === 'CastError') {
    res.status(400).json({
      success: false,
      message: 'Invalid data format',
      errors: [err.message],
    });
    return;
  }

  // Multer file upload errors (e.g. file too large)
  if (err.name === 'MulterError' || (err as NodeJS.ErrnoException).code?.startsWith('LIMIT_')) {
    res.status(400).json({
      success: false,
      message: err.message || 'File upload error',
    });
    return;
  }

  // Mongoose duplicate key
  if ((err as NodeJS.ErrnoException).code === '11000') {
    res.status(409).json({
      success: false,
      message: 'Duplicate key error',
    });
    return;
  }

  logger.error('Unhandled error:', err.name, err.message, err.stack);
  res.status(500).json({
    success: false,
    message: err.message || 'Internal server error',
  });
};
