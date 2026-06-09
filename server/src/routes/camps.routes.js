import express from 'express';
import { getCamps, createCamp, updateCamp, deleteCamp, getCampWorkers, assignCampWorkers } from '../controllers/camps.controller.js';
import { authenticate } from '../middleware/auth.js';
import { requireOwner } from '../middleware/roleGuard.js';

const router = express.Router();

router.use(authenticate, requireOwner);

router.get('/', getCamps);
router.post('/', createCamp);
router.put('/:id', updateCamp);
router.delete('/:id', deleteCamp);
router.get('/:id/workers', getCampWorkers);
router.post('/:id/workers', assignCampWorkers);

export default router;
