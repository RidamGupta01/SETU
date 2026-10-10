import express from 'express';
import { getAnalytics } from '../controllers/analyticsController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

router.get('/', protect, authorize('Department Officer', 'Super Admin'), getAnalytics);

export default router;
