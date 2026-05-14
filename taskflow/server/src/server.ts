import http from 'http';
import { createApp } from './app';
import { connectDB } from './config/db';
import { redis } from './config/redis';
import { initSockets } from './sockets';
import { env } from './config/env';
import { logger } from './utils/logger';

const startServer = async () => {
  await connectDB();

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
