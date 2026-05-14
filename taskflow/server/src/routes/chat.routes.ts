import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import {
  getConversations,
  createOrGetConversation,
  getMessages,
  markAsRead,
} from '../controllers/chat.controller';

const router = Router();

router.use(requireAuth);

router.get('/', getConversations);
router.post('/', createOrGetConversation);
router.get('/:conversationId/messages', getMessages);
router.patch('/:conversationId/read', markAsRead);

export default router;
