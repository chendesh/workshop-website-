/**
 * Attendance Controller
 * ----------------------
 * Mark and retrieve daily attendance for workers.
 * Owner can view all; workers can view their own.
 */

import { db } from '../config/firebase.js';
import { generateId, nowISO, successResponse, errorResponse } from '../utils/helpers.js';

const VALID_STATUSES = ['present', 'absent', 'half_day', 'on_leave', 'on_camp'];

// ── GET /api/attendance — Get attendance records with filters ──

export const getAttendance = async (req, res) => {
  try {
    const { date, workerId, status, startDate, endDate } = req.query;

    let query = db.collection('attendance');

    // If the user is a worker, restrict to their own records
    if (req.user.role === 'worker') {
      // Find the worker record linked to this user
      const workerSnap = await db.collection('workers').where('userId', '==', req.user.id).limit(1).get();
      if (workerSnap.empty) {
        return errorResponse(res, 'Worker profile not found.', 404);
      }
      const myWorkerId = workerSnap.docs[0].data().id;
      query = query.where('workerId', '==', myWorkerId);
    } else if (workerId) {
      query = query.where('workerId', '==', workerId);
    }

    const snap = await query.get();
    let records = snap.docs.map((doc) => doc.data());
    
    // Sort in memory by date desc to avoid composite index requirement
    records.sort((a, b) => b.date.localeCompare(a.date));

    // Client-side filters
    if (date) {
      records = records.filter((r) => r.date === date);
    }
    if (status) {
      records = records.filter((r) => r.status === status);
    }
    if (startDate) {
      records = records.filter((r) => r.date >= startDate);
    }
    if (endDate) {
      records = records.filter((r) => r.date <= endDate);
    }

    return successResponse(res, records, `Found ${records.length} attendance record(s).`);
  } catch (error) {
    console.error('GetAttendance error:', error);
    return errorResponse(res, 'Failed to fetch attendance records.');
  }
};

// ── POST /api/attendance — Mark attendance for one worker ───

export const markAttendance = async (req, res) => {
  try {
    const { workerId, date, status, remarks } = req.body;

    // Validate status
    if (!VALID_STATUSES.includes(status)) {
      return errorResponse(res, `Invalid status. Allowed: ${VALID_STATUSES.join(', ')}`, 400);
    }

    // Verify worker exists
    const workerDoc = await db.collection('workers').doc(workerId).get();
    if (!workerDoc.exists) {
      return errorResponse(res, 'Worker not found.', 404);
    }

    // Check for duplicate attendance on the same date
    const existing = await db.collection('attendance')
      .where('workerId', '==', workerId)
      .where('date', '==', date)
      .limit(1)
      .get();

    if (!existing.empty) {
      // Update existing record instead of creating duplicate
      const existingDoc = existing.docs[0];
      await db.collection('attendance').doc(existingDoc.id).update({
        status,
        remarks: remarks || '',
        updatedAt: nowISO(),
      });
      const updated = (await db.collection('attendance').doc(existingDoc.id).get()).data();
      return successResponse(res, updated, 'Attendance updated (record already existed for this date).');
    }

    const attId = generateId('ATT');
    const attData = {
      id: attId,
      workerId,
      workerName: workerDoc.data().fullName,
      date,
      status,
      remarks: remarks || '',
      createdAt: nowISO(),
    };

    await db.collection('attendance').doc(attId).set(attData);

    return successResponse(res, attData, 'Attendance marked successfully.', 201);
  } catch (error) {
    console.error('MarkAttendance error:', error);
    return errorResponse(res, 'Failed to mark attendance.');
  }
};

// ── POST /api/attendance/bulk — Bulk mark attendance ────────

export const bulkMarkAttendance = async (req, res) => {
  try {
    const { date, records } = req.body;
    // records: [{ workerId, status, remarks }]

    if (!Array.isArray(records) || records.length === 0) {
      return errorResponse(res, 'Records array is required and must not be empty.', 400);
    }

    const batch = db.batch();
    const results = [];

    for (const record of records) {
      const { workerId, status, remarks } = record;

      if (!VALID_STATUSES.includes(status)) {
        continue; // Skip invalid statuses
      }

      // Check for existing record
      const existing = await db.collection('attendance')
        .where('workerId', '==', workerId)
        .where('date', '==', date)
        .limit(1)
        .get();

      if (!existing.empty) {
        // Update existing
        const docRef = db.collection('attendance').doc(existing.docs[0].id);
        batch.update(docRef, { status, remarks: remarks || '', updatedAt: nowISO() });
        results.push({ workerId, date, status, action: 'updated' });
      } else {
        // Get worker name
        const workerDoc = await db.collection('workers').doc(workerId).get();
        const workerName = workerDoc.exists ? workerDoc.data().fullName : 'Unknown';

        const attId = generateId('ATT');
        const attData = {
          id: attId,
          workerId,
          workerName,
          date,
          status,
          remarks: remarks || '',
          createdAt: nowISO(),
        };
        batch.set(db.collection('attendance').doc(attId), attData);
        results.push({ workerId, date, status, action: 'created' });
      }
    }

    await batch.commit();

    return successResponse(res, results, `Processed ${results.length} attendance record(s).`, 201);
  } catch (error) {
    console.error('BulkMarkAttendance error:', error);
    return errorResponse(res, 'Failed to process bulk attendance.');
  }
};

// ── GET /api/attendance/worker/:workerId — Worker's attendance ──

export const getWorkerAttendance = async (req, res) => {
  try {
    const { workerId } = req.params;
    const { month, year } = req.query;

    // If worker is requesting, ensure they can only see their own
    if (req.user.role === 'worker') {
      const workerSnap = await db.collection('workers').where('userId', '==', req.user.id).limit(1).get();
      if (workerSnap.empty) {
        return errorResponse(res, 'Worker profile not found.', 404);
      }
      const myWorkerId = workerSnap.docs[0].data().id;
      if (myWorkerId !== workerId) {
        return errorResponse(res, 'You can only view your own attendance.', 403);
      }
    }

    const snap = await db.collection('attendance')
      .where('workerId', '==', workerId)
      .get();

    let records = snap.docs.map((doc) => doc.data());
    
    // Sort in memory by date desc
    records.sort((a, b) => b.date.localeCompare(a.date));

    // Filter by month/year if provided (dates are stored as DD/MM/YYYY strings)
    if (month && year) {
      const mm = month.padStart(2, '0');
      records = records.filter((r) => {
        const parts = r.date.split('/');
        return parts[1] === mm && parts[2] === year;
      });
    }

    // Calculate summary
    const summary = {
      total: records.length,
      present: records.filter((r) => r.status === 'present').length,
      absent: records.filter((r) => r.status === 'absent').length,
      halfDay: records.filter((r) => r.status === 'half_day').length,
      onLeave: records.filter((r) => r.status === 'on_leave').length,
      onCamp: records.filter((r) => r.status === 'on_camp').length,
    };

    return successResponse(res, { records, summary }, 'Worker attendance retrieved.');
  } catch (error) {
    console.error('GetWorkerAttendance error:', error);
    return errorResponse(res, 'Failed to fetch worker attendance.');
  }
};
