import express from 'express';
import { getWorkLogs, createWorkLog, updateWorkLog, deleteWorkLog, getWorkLogStats } from '../controllers/workLogs.controller.js';
import { authenticate } from '../middleware/auth.js';
import { requireOwner } from '../middleware/roleGuard.js';

const router = express.Router();

router.use(authenticate, requireOwner);

router.get('/', getWorkLogs);
router.post('/', createWorkLog);
router.put('/:id', updateWorkLog);
router.delete('/:id', deleteWorkLog);
router.get('/stats', getWorkLogStats);

export default router;
