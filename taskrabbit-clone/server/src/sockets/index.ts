import { Server as HttpServer } from 'http';
import { Server as SocketServer, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { createAdapter } from '@socket.io/redis-adapter';
import { redisPub, redisSub, redis } from '../config/redis';
import { env } from '../config/env';
import { Message } from '../models/Message';
import { Conversation } from '../models/Conversation';
import { logger } from '../utils/logger';
import { setIo } from './io';

const ONLINE_KEY = 'online_users';

export const initSockets = (server: HttpServer): void => {
  const io = new SocketServer(server, {
    cors: {
      origin: env.NODE_ENV === 'production' ? env.CLIENT_URL : true,
      credentials: true,
    },
    transports: ['websocket', 'polling'],
  });

  io.adapter(createAdapter(redisPub, redisSub));
  setIo(io);

  // ── Auth middleware ────────────────────────────────────────────────────────
  io.use((socket: Socket, next) => {
    const token = socket.handshake.auth?.token as string | undefined;
    if (!token) return next(new Error('Authentication required'));
    try {
      const payload = jwt.verify(token, env.JWT_SECRET) as { sub: string };
      socket.data.userId = payload.sub;
      next();
    } catch {
      next(new Error('Invalid or expired token'));
    }
  });

  // ── Connection ─────────────────────────────────────────────────────────────
  io.on('connection', async (socket: Socket) => {
    const userId = socket.data.userId as string;
    logger.info(`Socket connected: ${socket.id} (user: ${userId})`);

    // Join personal room for directed notifications
    socket.join(`user:${userId}`);

    // Mark online
    await redis.sadd(ONLINE_KEY, userId);
    socket.broadcast.emit('user:online', { userId });

    // Send current online list to just-connected user
    const online = await redis.smembers(ONLINE_KEY);
    socket.emit('online:list', online);

    // ── Room management ──────────────────────────────────────────────────────

    socket.on('join:conversation', async (conversationId: string) => {
      const conv = await Conversation.findById(conversationId).lean();
      if (!conv) return;
      const ids = conv.participants.map(String);
      if (!ids.includes(userId)) return;

      await socket.join(`conv:${conversationId}`);
      // Reset unread for this user
      await Conversation.findByIdAndUpdate(conversationId, {
        $set: { [`unreadCount.${userId}`]: 0 },
      });
      socket.emit('joined:conversation', conversationId);
    });

    socket.on('leave:conversation', (conversationId: string) => {
      socket.leave(`conv:${conversationId}`);
    });

    // ── Messaging ────────────────────────────────────────────────────────────

    socket.on(
      'message:send',
      async (data: { conversationId: string; content: string; messageType?: 'text' | 'image' | 'system' }) => {
        const { conversationId, content, messageType = 'text' } = data;
        if (!content?.trim() && messageType === 'text') return;

        const conv = await Conversation.findById(conversationId).lean();
        if (!conv) return;
        const ids = conv.participants.map(String);
        if (!ids.includes(userId)) return;

        const msg = await Message.create({
          conversationId,
          senderId: userId,
          content,
          messageType,
          readBy: [userId],
        });

        const populated = await msg.populate('senderId', 'name avatar');

        // Increment unread for other participants
        const unreadUpdate: Record<string, unknown> = {
          lastMessage: { content, senderId: userId, createdAt: new Date() },
        };
        for (const pid of ids) {
          if (pid !== userId) {
            const currentUnread = (conv.unreadCount as unknown as Record<string, number>)[pid] ?? 0;
          unreadUpdate[`unreadCount.${pid}`] = currentUnread + 1;
          }
        }
        await Conversation.findByIdAndUpdate(conversationId, { $set: unreadUpdate });

        io.to(`conv:${conversationId}`).emit('message:new', populated);
      }
    );

    // ── Typing indicators ─────────────────────────────────────────────────────

    socket.on('typing:start', (conversationId: string) => {
      socket.to(`conv:${conversationId}`).emit('typing:start', { userId, conversationId });
    });

    socket.on('typing:stop', (conversationId: string) => {
      socket.to(`conv:${conversationId}`).emit('typing:stop', { userId, conversationId });
    });

    // ── Read receipts ─────────────────────────────────────────────────────────

    socket.on('messages:read', async (conversationId: string) => {
      await Message.updateMany(
        { conversationId, readBy: { $ne: userId } },
        { $addToSet: { readBy: userId } }
      );
      await Conversation.findByIdAndUpdate(conversationId, {
        $set: { [`unreadCount.${userId}`]: 0 },
      });
      socket.to(`conv:${conversationId}`).emit('messages:read', { userId, conversationId });
    });

    // ── Disconnect ────────────────────────────────────────────────────────────

    socket.on('disconnect', async () => {
      logger.info(`Socket disconnected: ${socket.id} (user: ${userId})`);
      await redis.srem(ONLINE_KEY, userId);
      io.emit('user:offline', { userId });
    });
  });

  logger.info('Socket.io initialised');
};
