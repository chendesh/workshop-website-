import express from 'express';
import { getAttendance, markAttendance, bulkMarkAttendance, getWorkerAttendance } from '../controllers/attendance.controller.js';
import { authenticate } from '../middleware/auth.js';
import { requireOwner } from '../middleware/roleGuard.js';

const router = express.Router();

router.use(authenticate);

router.get('/worker/:workerId', getWorkerAttendance);

router.use(requireOwner);
router.get('/', getAttendance);
router.post('/', markAttendance);
router.post('/bulk', bulkMarkAttendance);

export default router;
