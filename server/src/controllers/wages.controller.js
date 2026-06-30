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

// ── Helper: Recompute worker totals using a running cumulative ledger ──
// Processes ALL dailyWages records in chronological order (oldest first),
// carrying a running total forward day by day:
//
//   runningTotal = previousRunningTotal + (amountPaidToday − fixedDailyWage)
//
//   if runningTotal >= 0  → advance = runningTotal, balance = 0
//   if runningTotal <  0  → advance = 0, balance = |runningTotal|
//
// This ensures overpayment credits are automatically applied against
// future underpayments, exactly like a real-world cash ledger.
const recomputeWorkerTotals = async (workerId) => {
  const [wagesSnap, workerDoc] = await Promise.all([
    db.collection('dailyWages').where('workerId', '==', workerId).get(),
    db.collection('workers').doc(workerId).get(),
  ]);

  if (!workerDoc.exists) return;

  const workerData = workerDoc.data();
  // Fallback daily rate from the worker document (used when a dailyWages
  // record doesn't have its own dailyRate stored — e.g. legacy data).
  const workerDailyRate = Number(workerData.dailyRate) || 0;

  // Sort records chronologically (oldest date first).
  // Dates are stored as DD/MM/YYYY — parse them for reliable sorting.
  const records = wagesSnap.docs.map((doc) => doc.data());
  records.sort((a, b) => {
    const parse = (d) =>
      d.includes('-')
        ? new Date(d).getTime()
        : new Date(d.split('/').reverse().join('-')).getTime();
    return parse(a.date) - parse(b.date);
  });

  // Walk through every day in order, carrying the running total forward.
  let runningTotal = 0;

  for (const rec of records) {
    // Use the dailyRate stored on the record (captured at time of payment)
    // so historical rate changes are respected. Fall back to the worker's
    // current rate if the record doesn't have one.
    const dailyRate = Number(rec.dailyRate) || workerDailyRate;
    const amountPaid = Number(rec.amount) || 0;

    runningTotal += amountPaid - dailyRate;
  }

  // Final state after processing all days
  const advance = runningTotal >= 0 ? runningTotal : 0;
  const balance = runningTotal < 0 ? Math.abs(runningTotal) : 0;

  await db.collection('workers').doc(workerId).update({
    balanceAmount: balance,
    advanceAmount: advance,
    updatedAt: nowISO(),
  });
};

// ── POST /api/wages/daily — Save or update daily wages ──
export const saveDailyWages = async (req, res) => {
  try {
    const { date, records } = req.body;
    // records: [{ workerId, workerName, amount, status: 'paid' | 'not_paid' }]

    if (!date || !Array.isArray(records)) {
      return errorResponse(res, 'date and an array of records are required.', 400);
    }

    // Track which workerIds are touched so we recompute their totals after
    const touchedWorkerIds = new Set();
    const batch = db.batch();

    for (const record of records) {
      // Deterministic ID: same worker + same date always hits the same document.
      // This guarantees re-saving a corrected amount OVERWRITES the old entry,
      // not creates a duplicate.
      const docId = `DW-${date.replace(/\//g, '')}-${record.workerId}`;
      const docRef = db.collection('dailyWages').doc(docId);

      // Fetch worker to get their fixed daily rate at time of payment
      const workerDoc = await db.collection('workers').doc(record.workerId).get();
      const worker = workerDoc.exists ? workerDoc.data() : {};

      const dailyRate = worker.dailyRate || 0;
      const amount = Number(record.amount) || 0;

      // Advance = overpayment (paid more than daily rate)
      const advanceAdded = Math.max(0, amount - dailyRate);
      // Balance = underpayment (paid less than daily rate)
      const balanceAdded = Math.max(0, dailyRate - amount);
      // Base amount = the portion that counts as regular pay (capped at daily rate)
      const baseAmount = Math.min(amount, dailyRate);

      // Overwrite the dailyWages document completely (no merge confusion)
      batch.set(docRef, {
        id: docId,
        date,
        workerId: record.workerId,
        workerName: record.workerName,
        dailyRate,
        amount,
        baseAmount,
        advanceAdded,
        balanceAdded,
        status: record.status || 'not_paid',
        updatedAt: nowISO(),
      });

      touchedWorkerIds.add(record.workerId);
    }

    // Write all dailyWages docs atomically first
    await batch.commit();

    // Then recompute totals for every affected worker from scratch.
    // This replaces the old delta approach and prevents any drift.
    await Promise.all([...touchedWorkerIds].map(recomputeWorkerTotals));

    return successResponse(res, null, 'Daily wages saved successfully.');
  } catch (error) {
    console.error('SaveDailyWages error:', error);
    return errorResponse(res, 'Failed to save daily wages.');
  }
};

// ── DELETE /api/wages/daily/:id — Delete a daily wage record ──
// After deletion, recomputes the worker's balance/advance from remaining records.
export const deleteDailyWage = async (req, res) => {
  try {
    const { id } = req.params;

    const docRef = db.collection('dailyWages').doc(id);
    const doc = await docRef.get();

    if (!doc.exists) {
      return errorResponse(res, 'Daily wage record not found.', 404);
    }

    const { workerId } = doc.data();

    // Delete the record
    await docRef.delete();

    // Recompute worker totals from all remaining records for this worker
    await recomputeWorkerTotals(workerId);

    return successResponse(res, null, 'Daily wage record deleted and worker totals recalculated.');
  } catch (error) {
    console.error('DeleteDailyWage error:', error);
    return errorResponse(res, 'Failed to delete daily wage record.');
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

// ── POST /api/wages/recalculate-all — Recalculate ALL worker balances ──
// Admin safety-net: fixes any stale balance/advance fields caused by
// external Firestore edits, console deletes, or any missed update.
export const recalculateAllWorkerBalances = async (req, res) => {
  try {
    const workersSnap = await db.collection('workers').get();

    if (workersSnap.empty) {
      return successResponse(res, { recalculated: 0 }, 'No workers found.');
    }

    // Recompute every worker in parallel for speed
    // Use doc.id instead of doc.data().id to guarantee a valid document ID
    const workerIds = workersSnap.docs.map((doc) => doc.id);
    
    // Use allSettled so one malformed worker doesn't crash the entire batch
    const results = await Promise.allSettled(
      workerIds.map(async (id) => {
        try {
          await recomputeWorkerTotals(id);
        } catch (err) {
          throw new Error(`Worker ${id}: ${err.message}`);
        }
      })
    );

    const failed = results.filter(r => r.status === 'rejected');
    const succeeded = results.filter(r => r.status === 'fulfilled');

    if (failed.length > 0) {
      const errorDetails = failed.map(f => f.reason.message).join(' | ');
      return errorResponse(
        res,
        `Recalculated ${succeeded.length}, but failed for ${failed.length} workers. Errors: ${errorDetails}`,
        500
      );
    }

    return successResponse(
      res,
      { recalculated: succeeded.length },
      `Recalculated balances for ${succeeded.length} worker(s). All totals now reflect live Firestore data.`
    );
  } catch (error) {
    console.error('RecalculateAllWorkerBalances error:', error);
    return errorResponse(res, 'Failed to recalculate worker balances.');
  }
};
