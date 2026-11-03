import express from 'express';
import { getActiveSession, openSession, closeSession, getSessions } from '../controllers/posSessionController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(protect);

router.get('/', getSessions);
router.get('/active', getActiveSession);
router.post('/open', openSession);
router.post('/close', closeSession);

export default router;
