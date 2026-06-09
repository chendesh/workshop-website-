/**
 * Camps Controller
 * -----------------
 * Manage camp (on-site) entries and worker assignments.
 */

import { db } from '../config/firebase.js';
import { generateId, nowISO, successResponse, errorResponse } from '../utils/helpers.js';

// ── GET /api/camps — List all camps ─────────────────────────

export const getCamps = async (req, res) => {
  try {
    const { status } = req.query;

    let query = db.collection('campEntries').orderBy('createdAt', 'desc');

    if (status) {
      query = db.collection('campEntries').where('status', '==', status).orderBy('createdAt', 'desc');
    }

    const snap = await query.get();
    const camps = snap.docs.map((doc) => doc.data());

    return successResponse(res, camps, `Found ${camps.length} camp(s).`);
  } catch (error) {
    console.error('GetCamps error:', error);
    return errorResponse(res, 'Failed to fetch camps.');
  }
};

// ── POST /api/camps — Create camp entry ─────────────────────

export const createCamp = async (req, res) => {
  try {
    const {
      startDate,
      endDate,
      durationDays,
      location,
      description,
      status,
      notes,
    } = req.body;

    const campId = generateId('CMP');
    const campData = {
      id: campId,
      startDate,
      endDate: endDate || '',
      durationDays: Number(durationDays) || 0,
      location: location || '',
      description: description || '',
      status: status || 'upcoming',
      notes: notes || '',
      createdAt: nowISO(),
    };

    await db.collection('campEntries').doc(campId).set(campData);

    return successResponse(res, campData, 'Camp entry created successfully.', 201);
  } catch (error) {
    console.error('CreateCamp error:', error);
    return errorResponse(res, 'Failed to create camp.');
  }
};

// ── PUT /api/camps/:id — Update camp ────────────────────────

export const updateCamp = async (req, res) => {
  try {
    const { id } = req.params;

    const campRef = db.collection('campEntries').doc(id);
    const campDoc = await campRef.get();

    if (!campDoc.exists) {
      return errorResponse(res, 'Camp not found.', 404);
    }

    const updates = { ...req.body, updatedAt: nowISO() };
    if (updates.durationDays !== undefined) {
      updates.durationDays = Number(updates.durationDays);
    }

    await campRef.update(updates);

    const updated = (await campRef.get()).data();
    return successResponse(res, updated, 'Camp updated successfully.');
  } catch (error) {
    console.error('UpdateCamp error:', error);
    return errorResponse(res, 'Failed to update camp.');
  }
};

// ── DELETE /api/camps/:id — Delete camp ─────────────────────

export const deleteCamp = async (req, res) => {
  try {
    const { id } = req.params;

    const campRef = db.collection('campEntries').doc(id);
    const campDoc = await campRef.get();

    if (!campDoc.exists) {
      return errorResponse(res, 'Camp not found.', 404);
    }

    // Also delete all camp worker assignments
    const campWorkersSnap = await db.collection('campWorkers').where('campId', '==', id).get();
    const batch = db.batch();
    batch.delete(campRef);
    campWorkersSnap.docs.forEach((doc) => batch.delete(doc.ref));
    await batch.commit();

    return successResponse(res, null, 'Camp and its worker assignments deleted.');
  } catch (error) {
    console.error('DeleteCamp error:', error);
    return errorResponse(res, 'Failed to delete camp.');
  }
};

// ── GET /api/camps/:id/workers — Get workers for a camp ─────

export const getCampWorkers = async (req, res) => {
  try {
    const { id } = req.params;

    // Verify camp exists
    const campDoc = await db.collection('campEntries').doc(id).get();
    if (!campDoc.exists) {
      return errorResponse(res, 'Camp not found.', 404);
    }

    const snap = await db.collection('campWorkers').where('campId', '==', id).get();
    const campWorkers = snap.docs.map((doc) => doc.data());

    return successResponse(res, {
      camp: campDoc.data(),
      workers: campWorkers,
    }, `Found ${campWorkers.length} worker(s) assigned to this camp.`);
  } catch (error) {
    console.error('GetCampWorkers error:', error);
    return errorResponse(res, 'Failed to fetch camp workers.');
  }
};

// ── POST /api/camps/:id/workers — Assign workers to camp ────

export const assignCampWorkers = async (req, res) => {
  try {
    const { id } = req.params;
    const { workers } = req.body;
    // workers: [{ workerId, campPay, foodAllowance, travelAllowance, accommodationAllowance }]

    // Verify camp exists
    const campDoc = await db.collection('campEntries').doc(id).get();
    if (!campDoc.exists) {
      return errorResponse(res, 'Camp not found.', 404);
    }

    if (!Array.isArray(workers) || workers.length === 0) {
      return errorResponse(res, 'Workers array is required.', 400);
    }

    const batch = db.batch();
    const results = [];

    for (const w of workers) {
      const {
        workerId,
        campPay = 0,
        foodAllowance = 0,
        travelAllowance = 0,
        accommodationAllowance = 0,
      } = w;

      // Get worker name
      const workerDoc = await db.collection('workers').doc(workerId).get();
      if (!workerDoc.exists) {
        results.push({ workerId, status: 'skipped', reason: 'Worker not found' });
        continue;
      }

      // Check if already assigned
      const existingSnap = await db.collection('campWorkers')
        .where('campId', '==', id)
        .where('workerId', '==', workerId)
        .limit(1)
        .get();

      if (!existingSnap.empty) {
        // Update existing assignment
        const docRef = existingSnap.docs[0].ref;
        const totalPay = Number(campPay) + Number(foodAllowance) + Number(travelAllowance) + Number(accommodationAllowance);
        batch.update(docRef, {
          campPay: Number(campPay),
          foodAllowance: Number(foodAllowance),
          travelAllowance: Number(travelAllowance),
          accommodationAllowance: Number(accommodationAllowance),
          totalPay,
          updatedAt: nowISO(),
        });
        results.push({ workerId, workerName: workerDoc.data().fullName, status: 'updated', totalPay });
        continue;
      }

      const cwId = generateId('CW');
      const totalPay = Number(campPay) + Number(foodAllowance) + Number(travelAllowance) + Number(accommodationAllowance);

      const cwData = {
        id: cwId,
        campId: id,
        workerId,
        workerName: workerDoc.data().fullName,
        campPay: Number(campPay),
        foodAllowance: Number(foodAllowance),
        travelAllowance: Number(travelAllowance),
        accommodationAllowance: Number(accommodationAllowance),
        totalPay,
        createdAt: nowISO(),
      };

      batch.set(db.collection('campWorkers').doc(cwId), cwData);
      results.push({ workerId, workerName: workerDoc.data().fullName, status: 'assigned', totalPay });
    }

    await batch.commit();

    return successResponse(res, results, `Processed ${results.length} worker assignment(s).`, 201);
  } catch (error) {
    console.error('AssignCampWorkers error:', error);
    return errorResponse(res, 'Failed to assign workers to camp.');
  }
};
