/**
 * Work Logs Controller
 * ---------------------
 * Manages excavation / welding job entries (owner-only).
 * Tracks client info, amounts, profit calculations.
 */

import { db } from '../config/firebase.js';
import { generateId, nowISO, successResponse, errorResponse } from '../utils/helpers.js';

// ── GET /api/work-logs — List work logs with filters ────────

export const getWorkLogs = async (req, res) => {
  try {
    const { status, workType, startDate, endDate, clientName, limit: queryLimit } = req.query;

    let query = db.collection('workLogs').orderBy('createdAt', 'desc');

    // Apply filters
    if (status) {
      query = db.collection('workLogs').where('status', '==', status).orderBy('createdAt', 'desc');
    }

    const snap = await query.get();
    let logs = snap.docs.map((doc) => doc.data());

    // Client-side filters (Firestore limitation: only one inequality + orderBy)
    if (workType) {
      logs = logs.filter((l) => l.workType === workType);
    }
    if (clientName) {
      logs = logs.filter((l) =>
        l.clientName.toLowerCase().includes(clientName.toLowerCase())
      );
    }
    if (startDate) {
      logs = logs.filter((l) => l.date >= startDate);
    }
    if (endDate) {
      logs = logs.filter((l) => l.date <= endDate);
    }
    if (queryLimit) {
      logs = logs.slice(0, parseInt(queryLimit));
    }

    return successResponse(res, logs, `Found ${logs.length} work log(s).`);
  } catch (error) {
    console.error('GetWorkLogs error:', error);
    return errorResponse(res, 'Failed to fetch work logs.');
  }
};

// ── POST /api/work-logs — Create work log ───────────────────

export const createWorkLog = async (req, res) => {
  try {
    const {
      orderId,
      date,
      clientName,
      clientPhone,
      workType,
      description,
      location,
      quotedAmount,
      receivedAmount,
      spentAmount,
      status,
      notes,
    } = req.body;

    const quoted = Number(quotedAmount) || 0;
    const received = Number(receivedAmount) || 0;
    const spent = Number(spentAmount) || 0;
    const balance = quoted - received;
    const profit = received - spent;

    const logId = generateId('WL');
    const logData = {
      id: logId,
      orderId: orderId || logId,
      date,
      clientName,
      clientPhone: clientPhone || '',
      workType: workType || 'general',
      description: description || '',
      location: location || '',
      quotedAmount: quoted,
      receivedAmount: received,
      spentAmount: spent,
      balance,
      profit,
      status: status || 'pending',
      notes: notes || '',
      createdAt: nowISO(),
    };

    await db.collection('workLogs').doc(logId).set(logData);

    return successResponse(res, logData, 'Work log created successfully.', 201);
  } catch (error) {
    console.error('CreateWorkLog error:', error);
    return errorResponse(res, 'Failed to create work log.');
  }
};

// ── PUT /api/work-logs/:id — Update work log ────────────────

export const updateWorkLog = async (req, res) => {
  try {
    const { id } = req.params;

    const logRef = db.collection('workLogs').doc(id);
    const logDoc = await logRef.get();

    if (!logDoc.exists) {
      return errorResponse(res, 'Work log not found.', 404);
    }

    const existing = logDoc.data();
    const updates = { ...req.body };

    // Recalculate financials if any amount field changed
    const quoted = updates.quotedAmount !== undefined ? Number(updates.quotedAmount) : existing.quotedAmount;
    const received = updates.receivedAmount !== undefined ? Number(updates.receivedAmount) : existing.receivedAmount;
    const spent = updates.spentAmount !== undefined ? Number(updates.spentAmount) : existing.spentAmount;

    updates.quotedAmount = quoted;
    updates.receivedAmount = received;
    updates.spentAmount = spent;
    updates.balance = quoted - received;
    updates.profit = received - spent;
    updates.updatedAt = nowISO();

    await logRef.update(updates);

    const updated = (await logRef.get()).data();
    return successResponse(res, updated, 'Work log updated successfully.');
  } catch (error) {
    console.error('UpdateWorkLog error:', error);
    return errorResponse(res, 'Failed to update work log.');
  }
};

// ── DELETE /api/work-logs/:id — Delete work log ─────────────

export const deleteWorkLog = async (req, res) => {
  try {
    const { id } = req.params;

    const logRef = db.collection('workLogs').doc(id);
    const logDoc = await logRef.get();

    if (!logDoc.exists) {
      return errorResponse(res, 'Work log not found.', 404);
    }

    await logRef.delete();
    return successResponse(res, null, 'Work log deleted successfully.');
  } catch (error) {
    console.error('DeleteWorkLog error:', error);
    return errorResponse(res, 'Failed to delete work log.');
  }
};

// ── GET /api/work-logs/stats — Summary statistics ───────────

export const getWorkLogStats = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const snap = await db.collection('workLogs').get();
    let logs = snap.docs.map((doc) => doc.data());

    // Optional date filtering
    if (startDate) {
      logs = logs.filter((l) => l.date >= startDate);
    }
    if (endDate) {
      logs = logs.filter((l) => l.date <= endDate);
    }

    const totalJobs = logs.length;
    const totalQuoted = logs.reduce((sum, l) => sum + (l.quotedAmount || 0), 0);
    const totalReceived = logs.reduce((sum, l) => sum + (l.receivedAmount || 0), 0);
    const totalSpent = logs.reduce((sum, l) => sum + (l.spentAmount || 0), 0);
    const totalBalance = logs.reduce((sum, l) => sum + (l.balance || 0), 0);
    const totalProfit = logs.reduce((sum, l) => sum + (l.profit || 0), 0);

    // Group by status
    const statusCounts = {};
    logs.forEach((l) => {
      statusCounts[l.status] = (statusCounts[l.status] || 0) + 1;
    });

    // Group by work type
    const typeCounts = {};
    logs.forEach((l) => {
      typeCounts[l.workType] = (typeCounts[l.workType] || 0) + 1;
    });

    return successResponse(res, {
      totalJobs,
      totalQuoted,
      totalReceived,
      totalSpent,
      totalBalance,
      totalProfit,
      statusCounts,
      typeCounts,
    }, 'Work log statistics retrieved.');
  } catch (error) {
    console.error('GetWorkLogStats error:', error);
    return errorResponse(res, 'Failed to fetch statistics.');
  }
};
