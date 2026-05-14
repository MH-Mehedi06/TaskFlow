import express from 'express';
import path from 'path';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import mongoSanitize from 'express-mongo-sanitize';
import rateLimit from 'express-rate-limit';
import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import passport from './config/passport';
import { env } from './config/env';
import { errorHandler } from './middleware/error.middleware';
import { notFound } from './middleware/notFound.middleware';

// Route imports
import authRoutes from './routes/auth.routes';
import categoryRoutes from './routes/category.routes';
import taskerRoutes from './routes/tasker.routes';
import taskRoutes from './routes/task.routes';
import paymentRoutes from './routes/payment.routes';
import chatRoutes from './routes/chat.routes';
import notificationRoutes from './routes/notification.routes';
import reviewRoutes from './routes/review.routes';
import disputeRoutes from './routes/dispute.routes';
import adminRoutes from './routes/admin.routes';
import aiRoutes from './routes/ai.routes';
import searchRoutes from './routes/search.routes';

export const createApp = () => {
  const app = express();

  app.set('trust proxy', 1);

  // Security
  app.use(helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  }));
  app.use(cors({
    origin: env.NODE_ENV === 'production' ? env.CLIENT_URL : true,
    credentials: true,
  }));
  app.use(mongoSanitize());

  // Raw body for Stripe webhook (must be before JSON parser)
  app.use('/api/payments/webhook', express.raw({ type: 'application/json' }));

  // Parsing
  app.use(cookieParser());
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Passport
  app.use(passport.initialize());

  // Serve locally uploaded files
  app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

  // Compression & logging
  app.use(compression());
  app.use(morgan(env.NODE_ENV === 'production' ? 'combined' : 'dev'));

  // Global rate limit
  app.use('/api/', rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: { success: false, message: 'Too many requests, please try again later.' },
    standardHeaders: true,
    legacyHeaders: false,
  }));

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      version: process.env.npm_package_version || '1.0.0',
      timestamp: new Date().toISOString(),
    });
  });

  // Routes
  app.use('/api/auth', authRoutes);
  app.use('/api/categories', categoryRoutes);
  app.use('/api/taskers', taskerRoutes);
  app.use('/api/tasks', taskRoutes);
  app.use('/api/payments', paymentRoutes);
  app.use('/api/conversations', chatRoutes);
  app.use('/api/notifications', notificationRoutes);
  app.use('/api/reviews', reviewRoutes);
  app.use('/api/disputes', disputeRoutes);
  app.use('/api/admin', adminRoutes);
  app.use('/api/ai', aiRoutes);
  app.use('/api/search', searchRoutes);

  // Swagger docs (dev only)
  if (env.NODE_ENV !== 'production') {
    const swaggerSpec = swaggerJsdoc({
      definition: {
        openapi: '3.0.0',
        info: { title: 'TaskFlow API', version: '1.0.0' },
        servers: [{ url: `http://localhost:${env.PORT}/api` }],
      },
      apis: ['./src/routes/*.ts'],
    });
    app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
  }

  app.use(notFound);
  app.use(errorHandler);

  return app;
};
