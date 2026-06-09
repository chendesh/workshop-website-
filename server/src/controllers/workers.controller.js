/**
 * Workers Controller
 * -------------------
 * CRUD operations for worker management (owner-only).
 * Creating a worker also creates a user account with auto-generated credentials.
 */

import bcrypt from 'bcryptjs';
import { db } from '../config/firebase.js';
import {
  generateId,
  generateUsername,
  generateTempPassword,
  nowISO,
  formatDate,
  getWeekStart,
  getWeekEnd,
  successResponse,
  errorResponse,
} from '../utils/helpers.js';

// ── GET /api/workers — List all workers ─────────────────────

export const getWorkers = async (req, res) => {
  try {
    const { status } = req.query; // 'active' | 'inactive' | undefined (all)

    let query = db.collection('workers');

    if (status === 'active') {
      query = query.where('isActive', '==', true);
    } else if (status === 'inactive') {
      query = query.where('isActive', '==', false);
    }

    const snap = await query.get();
    let workers = snap.docs.map((doc) => doc.data());
    
    // Sort in memory to avoid requiring a composite index
    workers.sort((a, b) => a.fullName.localeCompare(b.fullName));

    return successResponse(res, workers, `Found ${workers.length} worker(s).`);
  } catch (error) {
    console.error('GetWorkers error:', error);
    return errorResponse(res, 'Failed to fetch workers.');
  }
};

// ── POST /api/workers — Create worker + user account ────────

export const createWorker = async (req, res) => {
  try {
    const { fullName, phone, designation, dailyRate, joinDate, photoUrl } = req.body;

    // Generate credentials
    const username = generateUsername(fullName);
    const tempPassword = generateTempPassword();

    // Check for duplicate username — append random digits if needed
    let finalUsername = username;
    const existingUser = await db.collection('users').where('username', '==', username).limit(1).get();
    if (!existingUser.empty) {
      finalUsername = `${username}.${Math.floor(Math.random() * 999)}`;
    }

    // Hash password
    const salt = await bcrypt.genSalt(12);
    const passwordHash = await bcrypt.hash(tempPassword, salt);

    // Create user account
    const userId = generateId('USR');
    const userData = {
      id: userId,
      username: finalUsername,
      passwordHash,
      role: 'worker',
      fullName,
      isActive: true,
      createdAt: nowISO(),
    };

    // Create worker profile
    const workerId = generateId('WRK');
    const workerData = {
      id: workerId,
      userId,
      fullName,
      phone: phone || '',
      designation: designation || '',
      dailyRate: Number(dailyRate) || 0,
      joinDate: joinDate || '',
      photoUrl: photoUrl || '',
      isActive: true,
      createdAt: nowISO(),
    };

    // Create initial wage record for the current week
    const now = new Date();
    const weekStart = getWeekStart(now);
    const weekEnd = getWeekEnd(now);
    
    const wageId = generateId('WAG');
    const wageData = {
      id: wageId,
      workerId,
      workerName: fullName,
      weekStart: formatDate(weekStart),
      weekEnd: formatDate(weekEnd),
      daysPresent: 0,
      halfDays: 0,
      campDays: 0,
      dailyRate: Number(dailyRate) || 0,
      regularPay: 0,
      campPay: 0,
      totalWage: 0,
      status: 'pending',
      paidOn: null,
      notes: 'Auto-generated on creation',
      createdAt: nowISO(),
    };

    // Batch write both documents
    const batch = db.batch();
    batch.set(db.collection('users').doc(userId), userData);
    batch.set(db.collection('workers').doc(workerId), workerData);
    batch.set(db.collection('wages').doc(wageId), wageData);
    await batch.commit();

    return successResponse(
      res,
      {
        worker: workerData,
        credentials: {
          username: finalUsername,
          temporaryPassword: tempPassword,
        },
      },
      'Worker created successfully. Share the credentials with the worker.',
      201
    );
  } catch (error) {
    console.error('CreateWorker error:', error);
    return errorResponse(res, 'Failed to create worker.');
  }
};

// ── PUT /api/workers/:id — Update worker details ────────────

export const updateWorker = async (req, res) => {
  try {
    const { id } = req.params;
    const { fullName, phone, designation, dailyRate, joinDate, photoUrl } = req.body;

    const workerRef = db.collection('workers').doc(id);
    const workerDoc = await workerRef.get();

    if (!workerDoc.exists) {
      return errorResponse(res, 'Worker not found.', 404);
    }

    const updates = {};
    if (fullName !== undefined) updates.fullName = fullName;
    if (phone !== undefined) updates.phone = phone;
    if (designation !== undefined) updates.designation = designation;
    if (dailyRate !== undefined) updates.dailyRate = Number(dailyRate);
    if (joinDate !== undefined) updates.joinDate = joinDate;
    if (photoUrl !== undefined) updates.photoUrl = photoUrl;
    updates.updatedAt = nowISO();

    await workerRef.update(updates);

    // Also update fullName in the linked user document if it changed
    if (fullName) {
      const workerData = workerDoc.data();
      await db.collection('users').doc(workerData.userId).update({ fullName });
    }

    const updated = (await workerRef.get()).data();
    return successResponse(res, updated, 'Worker updated successfully.');
  } catch (error) {
    console.error('UpdateWorker error:', error);
    return errorResponse(res, 'Failed to update worker.');
  }
};

// ── PUT /api/workers/:id/deactivate — Deactivate worker ─────

export const deactivateWorker = async (req, res) => {
  try {
    const { id } = req.params;

    const workerRef = db.collection('workers').doc(id);
    const workerDoc = await workerRef.get();

    if (!workerDoc.exists) {
      return errorResponse(res, 'Worker not found.', 404);
    }

    const workerData = workerDoc.data();

    // Toggle active status
    const newStatus = !workerData.isActive;

    const batch = db.batch();
    batch.update(workerRef, { isActive: newStatus, updatedAt: nowISO() });
    batch.update(db.collection('users').doc(workerData.userId), { isActive: newStatus });
    await batch.commit();

    const statusText = newStatus ? 'activated' : 'deactivated';
    return successResponse(res, { isActive: newStatus }, `Worker ${statusText} successfully.`);
  } catch (error) {
    console.error('DeactivateWorker error:', error);
    return errorResponse(res, 'Failed to update worker status.');
  }
};

// ── PUT /api/workers/:id/reset-password — Reset password ────

export const resetWorkerPassword = async (req, res) => {
  try {
    const { id } = req.params;

    const workerDoc = await db.collection('workers').doc(id).get();
    if (!workerDoc.exists) {
      return errorResponse(res, 'Worker not found.', 404);
    }

    const workerData = workerDoc.data();
    const newPassword = generateTempPassword();

    const salt = await bcrypt.genSalt(12);
    const passwordHash = await bcrypt.hash(newPassword, salt);

    await db.collection('users').doc(workerData.userId).update({ passwordHash });

    // Fetch the username for the response
    const userDoc = await db.collection('users').doc(workerData.userId).get();
    const username = userDoc.data().username;

    return successResponse(
      res,
      {
        workerName: workerData.fullName,
        username,
        newPassword,
      },
      'Password reset successfully. Share the new credentials with the worker.'
    );
  } catch (error) {
    console.error('ResetPassword error:', error);
    return errorResponse(res, 'Failed to reset password.');
  }
};
