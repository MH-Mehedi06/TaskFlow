import { Request, Response, NextFunction } from 'express';
import { ApiError } from '../../src/utils/ApiError';
import { ApiResponse } from '../../src/utils/ApiResponse';
import { asyncHandler } from '../../src/utils/asyncHandler';

describe('ApiError', () => {
  it('sets statusCode, message, and isOperational', () => {
    const err = new ApiError(404, 'Not found');
    expect(err.statusCode).toBe(404);
    expect(err.message).toBe('Not found');
    expect(err.isOperational).toBe(true);
    expect(err instanceof Error).toBe(true);
  });

  it('defaults errors to empty array', () => {
    const err = new ApiError(400, 'Bad request');
    expect(err.errors).toEqual([]);
  });

  it('accepts custom errors array', () => {
    const errs = [{ field: 'email', msg: 'invalid' }];
    const err = new ApiError(422, 'Validation failed', errs);
    expect(err.errors).toEqual(errs);
  });

  it('accepts custom stack trace', () => {
    const err = new ApiError(500, 'Oops', [], 'custom stack');
    expect(err.stack).toBe('custom stack');
  });
});

describe('ApiResponse', () => {
  it('marks 2xx as success', () => {
    const r = new ApiResponse(200, { id: 1 }, 'OK');
    expect(r.success).toBe(true);
    expect(r.data).toEqual({ id: 1 });
    expect(r.message).toBe('OK');
  });

  it('marks 4xx as not success', () => {
    const r = new ApiResponse(400, null, 'Bad request');
    expect(r.success).toBe(false);
  });

  it('uses default message when not provided', () => {
    const r = new ApiResponse(201, {});
    expect(r.message).toBe('Success');
  });
});

describe('asyncHandler', () => {
  const mockRes = {} as Response;

  it('calls the wrapped function', async () => {
    const fn = jest.fn().mockResolvedValue(undefined);
    const handler = asyncHandler(fn);
    await handler({} as Request, mockRes, jest.fn() as NextFunction);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('forwards thrown errors to next()', async () => {
    const error = new Error('something broke');
    const fn = jest.fn().mockRejectedValue(error);
    const next = jest.fn();
    const handler = asyncHandler(fn);
    await handler({} as Request, mockRes, next as NextFunction);
    expect(next).toHaveBeenCalledWith(error);
  });
});
