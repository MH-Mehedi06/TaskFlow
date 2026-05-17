import http from 'http';
import bcrypt from 'bcryptjs';
import { createApp } from './app';
import { connectDB } from './config/db';
import { redis } from './config/redis';
import { initSockets } from './sockets';
import { env } from './config/env';
import { logger } from './utils/logger';
import { User } from './models/User';

const ADMIN_EMAIL = 'admin@gmail.com';
const ADMIN_PASSWORD = 'Admin@123';

async function ensureAdminUser() {
  if (env.NODE_ENV !== 'development') return;
  try {
    const existing = await User.findOne({ email: ADMIN_EMAIL });
    if (existing) {
      existing.role = 'admin';
      existing.isVerified = true;
      existing.isActive = true;
      existing.isBanned = false;
      existing.passwordHash = ADMIN_PASSWORD; // pre-save hook will bcrypt-hash this
      await existing.save();
      logger.info(`[dev] Admin user reset  → ${ADMIN_EMAIL} / ${ADMIN_PASSWORD}`);
    } else {
      await User.create({
        name: 'Admin',
        email: ADMIN_EMAIL,
        passwordHash: ADMIN_PASSWORD, // pre-save hook will bcrypt-hash this
        role: 'admin',
        isVerified: true,
        isActive: true,
        isBanned: false,
        oauthProviders: [],
        notifications: { email: true, push: true },
      });
      logger.info(`[dev] Admin user created → ${ADMIN_EMAIL} / ${ADMIN_PASSWORD}`);
    }
  } catch (err) {
    logger.warn('[dev] ensureAdminUser failed:', (err as Error).message);
  }
}

const startServer = async () => {
  await connectDB();
  await ensureAdminUser();

  const app = createApp();
  const server = http.createServer(app);

  initSockets(server);

  server.listen(env.PORT, () => {
    logger.info(`Server running on port ${env.PORT} in ${env.NODE_ENV} mode`);
  });

  server.on('error', (err: NodeJS.ErrnoException) => {
    if (err.code === 'EADDRINUSE') {
      logger.error(`Port ${env.PORT} already in use. Run: fuser -k ${env.PORT}/tcp`);
      process.exit(1);
    } else {
      throw err;
    }
  });

  const shutdown = async () => {
    logger.info('Shutting down server...');
    server.close(async () => {
      await redis.quit();
      process.exit(0);
    });
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
  process.on('unhandledRejection', (reason) => {
    logger.error('Unhandled Rejection:', reason);
    process.exit(1);
  });
};

startServer();
