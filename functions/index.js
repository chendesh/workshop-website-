/**
 * Firebase Cloud Functions — Daily Wages Triggers
 * ------------------------------------------------
 * Automatically recomputes a worker's balance and advance totals
 * whenever a dailyWages document is created, updated, or deleted
 * in Firestore — regardless of whether the change came through
 * the app's API or directly via the Firebase console.
 *
 * DEPLOY:
 *   cd functions && npm install
 *   firebase deploy --only functions
 *
 * REQUIREMENTS:
 *   Firebase project must be on the Blaze (pay-as-you-go) plan.
 */

const { onDocumentWritten } = require('firebase-functions/v2/firestore');
const { initializeApp } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

// Initialize Firebase Admin (uses Application Default Credentials in Cloud Functions)
initializeApp();
const db = getFirestore();

/**
 * Recompute a worker's balanceAmount and advanceAmount
 * by summing ALL dailyWages records for that worker.
 * Resets to ₹0 when no records remain.
 *
 * @param {string} workerId
 */
async function recomputeWorkerTotals(workerId) {
  if (!workerId) return;

  const [wagesSnap, workerDoc] = await Promise.all([
    db.collection('dailyWages').where('workerId', '==', workerId).get(),
    db.collection('workers').doc(workerId).get(),
  ]);

  // Skip if the worker document no longer exists
  if (!workerDoc.exists) return;

  let totalBalance = 0;
  let totalAdvance = 0;

  wagesSnap.forEach((doc) => {
    const data = doc.data();
    totalBalance += Number(data.balanceAdded) || 0;
    totalAdvance += Number(data.advanceAdded) || 0;
  });

  await db.collection('workers').doc(workerId).update({
    balanceAmount: totalBalance,
    advanceAmount: totalAdvance,
    updatedAt: new Date().toISOString(),
  });

  console.log(
    `[recomputeWorkerTotals] Worker ${workerId}: balance=₹${totalBalance}, advance=₹${totalAdvance}`
  );
}

/**
 * Trigger: fires on any write (create, update, delete) to a dailyWages document.
 * The document ID format is: DW-DDMMYYYY-WORKERID
 *
 * This covers:
 *   - App API saves/updates (belt-and-suspenders alongside the server code)
 *   - Direct Firebase console deletions or edits
 *   - Any import or bulk-delete operations
 */
exports.onDailyWageWritten = onDocumentWritten(
  'dailyWages/{docId}',
  async (event) => {
    try {
      // Determine the workerId from whichever version of the doc exists
      const after  = event.data?.after?.data();
      const before = event.data?.before?.data();
      const workerId = (after?.workerId) || (before?.workerId);

      if (!workerId) {
        console.warn('[onDailyWageWritten] Could not determine workerId — skipping.');
        return null;
      }

      await recomputeWorkerTotals(workerId);
      return null;
    } catch (err) {
      console.error('[onDailyWageWritten] Error:', err);
      return null;
    }
  }
);
