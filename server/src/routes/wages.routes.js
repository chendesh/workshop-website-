import express from 'express';
import { getWages, getWorkerWages, calculateWeeklyWages, updateWageStatus, updateWageAmount, getDailyWages, saveDailyWages, getWorkerDailyWages, deleteDailyWage, recalculateAllWorkerBalances } from '../controllers/wages.controller.js';
import { authenticate } from '../middleware/auth.js';
import { requireOwner } from '../middleware/roleGuard.js';

const router = express.Router();

router.use(authenticate);

router.get('/worker/:workerId', getWorkerWages);
router.get('/daily/worker/:workerId', getWorkerDailyWages);

router.use(requireOwner);
router.get('/', getWages);
router.get('/daily', getDailyWages);
router.post('/daily', saveDailyWages);
router.delete('/daily/:id', deleteDailyWage);
router.post('/recalculate-all', recalculateAllWorkerBalances);
router.post('/calculate', calculateWeeklyWages);
router.put('/:id', updateWageStatus);
router.put('/:id/amount', updateWageAmount);

export default router;
