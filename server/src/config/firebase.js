/**
 * Firebase Admin SDK Configuration
 * ---------------------------------
 * Initializes Firebase Admin with service account credentials.
 * Supports both file-based and env-var-based configuration.
 */

import admin from 'firebase-admin';
import { readFileSync, existsSync } from 'fs';
import dotenv from 'dotenv';

dotenv.config();

let serviceAccount;

// Option 1: Load from JSON file path
if (process.env.FIREBASE_SERVICE_ACCOUNT_PATH && existsSync(process.env.FIREBASE_SERVICE_ACCOUNT_PATH)) {
  const raw = readFileSync(process.env.FIREBASE_SERVICE_ACCOUNT_PATH, 'utf8');
  serviceAccount = JSON.parse(raw);
}

// Option 2: Build from individual env vars
if (!serviceAccount && process.env.FIREBASE_PROJECT_ID) {
  serviceAccount = {
    type: 'service_account',
    project_id: process.env.FIREBASE_PROJECT_ID,
    client_email: process.env.FIREBASE_CLIENT_EMAIL,
    // Replace escaped newlines so the PEM key is valid
    private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  };
}

if (!serviceAccount) {
  console.error('❌ Firebase credentials not found. Set FIREBASE_SERVICE_ACCOUNT_PATH or individual env vars.');
  process.exit(1);
}

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

// Firestore settings
db.settings({ ignoreUndefinedProperties: true });

console.log('✅ Firebase Admin SDK initialized');

export { admin, db };
