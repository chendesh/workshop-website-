import express from 'express';
import { getWorkers, createWorker, updateWorker, deactivateWorker, resetWorkerPassword } from '../controllers/workers.controller.js';
import { authenticate } from '../middleware/auth.js';
import { requireOwner } from '../middleware/roleGuard.js';

const router = express.Router();

router.use(authenticate, requireOwner);

router.get('/', getWorkers);
router.post('/', createWorker);
router.put('/:id', updateWorker);
router.put('/:id/deactivate', deactivateWorker);
router.put('/:id/reset-password', resetWorkerPassword);

export default router;
