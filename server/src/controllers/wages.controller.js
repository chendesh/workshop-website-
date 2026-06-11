/**
 * Wages Controller
 * -----------------
 * Calculate and manage weekly wages for workers.
 * Pulls attendance data to compute pay automatically.
 */

import { db } from '../config/firebase.js';
import {
  generateId,
  nowISO,
  formatDate,
  parseDate,
  getWeekStart,
  getWeekEnd,
  successResponse,
  errorResponse,
} from '../utils/helpers.js';

// ── GET /api/wages — Get all wage records ───────────────────

export const getWages = async (req, res) => {
  try {
    const { status, workerId, startDate, endDate } = req.query;

    let query = db.collection('wages');

    if (status) {
      query = query.where('status', '==', status);
    }

    const snap = await query.get();
    let wages = snap.docs.map((doc) => doc.data());

    // Sort in memory to avoid requiring a composite index
    wages.sort((a, b) => b.weekStart.localeCompare(a.weekStart));

    // Client-side filters
    if (workerId) {
      wages = wages.filter((w) => w.workerId === workerId);
    }
    if (startDate) {
      wages = wages.filter((w) => w.weekStart >= startDate);
    }
    if (endDate) {
      wages = wages.filter((w) => w.weekEnd <= endDate);
    }

    return successResponse(res, wages, `Found ${wages.length} wage record(s).`);
  } catch (error) {
    console.error('GetWages error:', error);
    return errorResponse(res, 'Failed to fetch wages.');
  }
};


// ── GET /api/wages/worker/:workerId — Worker's wages ────────

export const getWorkerWages = async (req, res) => {
  try {
    const { workerId } = req.params;

    // If worker, ensure they only see their own
    if (req.user.role === 'worker') {
      const workerSnap = await db.collection('workers').where('userId', '==', req.user.id).limit(1).get();
      if (workerSnap.empty) {
        return errorResponse(res, 'Worker profile not found.', 404);
      }
      const myWorkerId = workerSnap.docs[0].data().id;
      if (myWorkerId !== workerId) {
        return errorResponse(res, 'You can only view your own wages.', 403);
      }
    }

    const snap = await db.collection('wages')
      .where('workerId', '==', workerId)
      .get();

    const wages = snap.docs.map((doc) => doc.data());
    
    // Sort in memory to avoid requiring a composite index
    wages.sort((a, b) => b.weekStart.localeCompare(a.weekStart));

    // Calculate totals
    const totalEarned = wages.reduce((sum, w) => sum + (w.totalWage || 0), 0);
    const totalPaid = wages
      .filter((w) => w.status === 'paid')
      .reduce((sum, w) => sum + (w.totalWage || 0), 0);
    const totalPending = wages
      .filter((w) => w.status === 'pending')
      .reduce((sum, w) => sum + (w.totalWage || 0), 0);

    return successResponse(res, {
      wages,
      summary: { totalEarned, totalPaid, totalPending },
    }, 'Worker wages retrieved.');
  } catch (error) {
    console.error('GetWorkerWages error:', error);
    return errorResponse(res, 'Failed to fetch worker wages.');
  }
};

// ── POST /api/wages/calculate — Calculate weekly wages ──────

export const calculateWeeklyWages = async (req, res) => {
  try {
    const { weekStartDate, workerIds } = req.body;
    // weekStartDate: DD/MM/YYYY (Monday of the target week)
    // workerIds: optional array — if empty, calculate for all active workers

    if (!weekStartDate) {
      return errorResponse(res, 'weekStartDate is required (DD/MM/YYYY).', 400);
    }

    const weekStart = parseDate(weekStartDate);
    const weekEnd = getWeekEnd(weekStart);
    const weekStartStr = formatDate(weekStart);
    const weekEndStr = formatDate(weekEnd);

    // Get workers
    let workers = [];
    if (workerIds && workerIds.length > 0) {
      for (const wid of workerIds) {
        const doc = await db.collection('workers').doc(wid).get();
        if (doc.exists && doc.data().isActive) {
          workers.push(doc.data());
        }
      }
    } else {
      const snap = await db.collection('workers').where('isActive', '==', true).get();
      workers = snap.docs.map((doc) => doc.data());
    }

    if (workers.length === 0) {
      return errorResponse(res, 'No active workers found.', 404);
    }

    const batch = db.batch();
    const results = [];

    for (const worker of workers) {
      // Check if wage already calculated for this week
      const existingWage = await db.collection('wages')
        .where('workerId', '==', worker.id)
        .where('weekStart', '==', weekStartStr)
        .limit(1)
        .get();

      if (!existingWage.empty) {
        results.push({
          workerId: worker.id,
          workerName: worker.fullName,
          status: 'skipped',
          reason: 'Wage already calculated for this week.',
        });
        continue;
      }

      // Fetch attendance for this week
      const attSnap = await db.collection('attendance')
        .where('workerId', '==', worker.id)
        .get();

      const weekAttendance = attSnap.docs
        .map((doc) => doc.data())
        .filter((a) => {
          const attDate = parseDate(a.date);
          return attDate >= weekStart && attDate <= weekEnd;
        });

      // Count days
      const daysPresent = weekAttendance.filter((a) => a.status === 'present').length;
      const halfDays = weekAttendance.filter((a) => a.status === 'half_day').length;
      const campDays = weekAttendance.filter((a) => a.status === 'on_camp').length;

      // Calculate wage
      const dailyRate = worker.dailyRate || 0;
      const regularPay = (daysPresent * dailyRate) + (halfDays * dailyRate * 0.5);

      // Camp pay: check campWorkers for any active camp assignments
      let campPay = 0;
      if (campDays > 0) {
        const campWorkerSnap = await db.collection('campWorkers')
          .where('workerId', '==', worker.id)
          .get();
        const campAssignments = campWorkerSnap.docs.map((doc) => doc.data());
        campPay = campAssignments.reduce((sum, cw) => sum + (cw.totalPay || 0), 0);
        // Proportional camp pay for the week (simplified: campDays * dailyRate if no specific camp pay)
        if (campPay === 0) {
          campPay = campDays * dailyRate;
        }
      }

      const totalWage = regularPay + campPay;

      const wageId = generateId('WAG');
      const wageData = {
        id: wageId,
        workerId: worker.id,
        workerName: worker.fullName,
        weekStart: weekStartStr,
        weekEnd: weekEndStr,
        daysPresent,
        halfDays,
        campDays,
        dailyRate,
        regularPay,
        campPay,
        totalWage,
        status: 'pending',
        paidOn: null,
        notes: '',
        createdAt: nowISO(),
      };

      batch.set(db.collection('wages').doc(wageId), wageData);
      results.push({
        workerId: worker.id,
        workerName: worker.fullName,
        status: 'calculated',
        totalWage,
        breakdown: { daysPresent, halfDays, campDays, regularPay, campPay },
      });
    }

    await batch.commit();

    return successResponse(res, results, `Wages calculated for ${results.filter((r) => r.status === 'calculated').length} worker(s).`, 201);
  } catch (error) {
    console.error('CalculateWeeklyWages error:', error);
    return errorResponse(res, 'Failed to calculate wages.');
  }
};

// ── PUT /api/wages/:id — Update wage status ─────────────────

export const updateWageStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;

    if (!['paid', 'pending'].includes(status)) {
      return errorResponse(res, "Status must be 'paid' or 'pending'.", 400);
    }

    const wageRef = db.collection('wages').doc(id);
    const wageDoc = await wageRef.get();

    if (!wageDoc.exists) {
      return errorResponse(res, 'Wage record not found.', 404);
    }

    const updates = {
      status,
      updatedAt: nowISO(),
    };

    if (status === 'paid') {
      updates.paidOn = nowISO();
    } else {
      updates.paidOn = null;
    }

    if (notes !== undefined) {
      updates.notes = notes;
    }

    await wageRef.update(updates);

    const updated = (await wageRef.get()).data();
    return successResponse(res, updated, `Wage marked as ${status}.`);
  } catch (error) {
    console.error('UpdateWageStatus error:', error);
    return errorResponse(res, 'Failed to update wage status.');
  }
};

// ── PUT /api/wages/:id/amount — Update wage amount directly ─

export const updateWageAmount = async (req, res) => {
  try {
    const { id } = req.params;
    const { totalWage } = req.body;

    if (totalWage === undefined || isNaN(totalWage)) {
      return errorResponse(res, 'Valid totalWage number is required.', 400);
    }

    const wageRef = db.collection('wages').doc(id);
    const wageDoc = await wageRef.get();

    if (!wageDoc.exists) {
      return errorResponse(res, 'Wage record not found.', 404);
    }

    await wageRef.update({
      totalWage: Number(totalWage),
      notes: (wageDoc.data().notes || '') + ' (Manually overridden)',
      updatedAt: nowISO(),
    });

    const updated = (await wageRef.get()).data();
    return successResponse(res, updated, 'Wage amount updated successfully.');
  } catch (error) {
    console.error('UpdateWageAmount error:', error);
    return errorResponse(res, 'Failed to update wage amount.');
  }
};

// ── GET /api/wages/daily — Get daily wages for a specific date ──
export const getDailyWages = async (req, res) => {
  try {
    const { date } = req.query; // DD/MM/YYYY
    if (!date) {
      return errorResponse(res, 'date query parameter is required (DD/MM/YYYY).', 400);
    }

    const snap = await db.collection('dailyWages').where('date', '==', date).get();
    const records = snap.docs.map(doc => doc.data());

    return successResponse(res, records, `Found ${records.length} daily wage records.`);
  } catch (error) {
    console.error('GetDailyWages error:', error);
    return errorResponse(res, 'Failed to fetch daily wages.');
  }
};

// ── POST /api/wages/daily — Save or update daily wages ──
export const saveDailyWages = async (req, res) => {
  try {
    const { date, records } = req.body;
    // records: [{ workerId, workerName, amount, status: 'paid' | 'not_paid' }]

    if (!date || !Array.isArray(records)) {
      return errorResponse(res, 'date and an array of records are required.', 400);
    }

    const batch = db.batch();

    for (const record of records) {
      // Create a unique deterministic ID for the day + worker
      const docId = `DW-${date.replace(/\//g, '')}-${record.workerId}`;
      const docRef = db.collection('dailyWages').doc(docId);
      
      // Fetch worker to get dailyRate
      const workerRef = db.collection('workers').doc(record.workerId);
      const workerDoc = await workerRef.get();
      const worker = workerDoc.exists ? workerDoc.data() : {};
      
      const dailyRate = worker.dailyRate || 0;
      const amount = Number(record.amount) || 0;
      
      const newAdvanceAdded = Math.max(0, amount - dailyRate);
      const baseAmount = Math.min(amount, dailyRate);
      
      // Fetch old daily wage to check previous advance added
      const oldDoc = await docRef.get();
      const oldAdvanceAdded = oldDoc.exists ? (oldDoc.data().advanceAdded || 0) : 0;
      
      const advanceDelta = newAdvanceAdded - oldAdvanceAdded;
      if (advanceDelta !== 0 && worker.id) {
          const newAdvanceAmount = (worker.advanceAmount || 0) + advanceDelta;
          batch.update(workerRef, { advanceAmount: newAdvanceAmount, updatedAt: nowISO() });
      }
      
      batch.set(docRef, {
        id: docId,
        date,
        workerId: record.workerId,
        workerName: record.workerName,
        amount,
        baseAmount,
        advanceAdded: newAdvanceAdded,
        status: record.status || 'not_paid', // 'paid' or 'not_paid'
        updatedAt: nowISO()
      }, { merge: true });
    }

    await batch.commit();

    return successResponse(res, null, 'Daily wages saved successfully.');
  } catch (error) {
    console.error('SaveDailyWages error:', error);
    return errorResponse(res, 'Failed to save daily wages.');
  }
};

// ── GET /api/wages/daily/worker/:workerId — Get worker's daily wages ──
export const getWorkerDailyWages = async (req, res) => {
  try {
    const { workerId } = req.params;

    // Restrict access if the user is a worker
    if (req.user.role === 'worker') {
      const workerSnap = await db.collection('workers').where('userId', '==', req.user.id).limit(1).get();
      if (workerSnap.empty) {
        return errorResponse(res, 'Worker profile not found.', 404);
      }
      const myWorkerId = workerSnap.docs[0].data().id;
      if (myWorkerId !== workerId) {
        return errorResponse(res, 'You can only view your own daily wages.', 403);
      }
    }

    const snap = await db.collection('dailyWages').where('workerId', '==', workerId).get();
    const records = snap.docs.map(doc => doc.data());

    // Sort by date descending (parsing DD/MM/YYYY or YYYY-MM-DD for sorting)
    records.sort((a, b) => {
       const parse = (d) => d.includes('-') ? new Date(d).getTime() : new Date(d.split('/').reverse().join('-')).getTime();
       return parse(b.date) - parse(a.date);
    });

    return successResponse(res, records, `Found ${records.length} daily wage records.`);
  } catch (error) {
    console.error('GetWorkerDailyWages error:', error);
    return errorResponse(res, 'Failed to fetch worker daily wages.');
  }
};
