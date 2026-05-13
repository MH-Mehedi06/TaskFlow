import { Router } from 'express';
import { semanticSearchTaskers, unifiedSearch, reindexAllTaskers } from '../controllers/search.controller';
import { requireAuth, requireRole } from '../middleware/auth.middleware';
import { cacheResponse } from '../middleware/cache.middleware';

const router = Router();

// Search results: cache 60s per unique query URL
router.get('/', cacheResponse(60), unifiedSearch);
router.get('/taskers', cacheResponse(120), semanticSearchTaskers);
router.post('/reindex', requireAuth, requireRole('admin'), reindexAllTaskers);

export default router;
