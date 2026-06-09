import express from 'express';
import { generateWeeklyReport, generateMonthlyReport, getReports, downloadReport } from '../controllers/reports.controller.js';
import { authenticate } from '../middleware/auth.js';
import { requireOwner } from '../middleware/roleGuard.js';

const router = express.Router();

router.use(authenticate, requireOwner);

router.post('/weekly', generateWeeklyReport);
router.post('/monthly', generateMonthlyReport);
router.get('/', getReports);
router.get('/download/:id', downloadReport);

export default router;
