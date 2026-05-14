import mongoose from 'mongoose';
import { env } from './env';
import { logger } from '../utils/logger';

export const connectDB = async (): Promise<void> => {
  mongoose.connection.on('connected', () => logger.info('MongoDB connected'));
  mongoose.connection.on('error', (err) => logger.error('MongoDB error', err.message));
  mongoose.connection.on('disconnected', () => logger.warn('MongoDB disconnected'));

  try {
    await mongoose.connect(env.MONGODB_URI, {
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
      maxPoolSize: 20,       // up to 20 concurrent connections
      minPoolSize: 2,        // keep 2 warm connections alive
      maxIdleTimeMS: 30000,  // close idle connections after 30s
      compressors: 'zlib',
    });
  } catch (err) {
    logger.error('MongoDB initial connection failed', (err as Error).message);
    process.exit(1);
  }
};
