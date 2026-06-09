/**
 * Auth Controller
 * ----------------
 * Handles owner signup, login (owner + worker), and profile retrieval.
 */

import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { db } from '../config/firebase.js';
import { generateId, nowISO, successResponse, errorResponse } from '../utils/helpers.js';

const JWT_SECRET = process.env.JWT_SECRET || 'default_dev_secret';
const JWT_EXPIRES_IN = '24h';

// ── POST /api/auth/signup — Owner signup (only one allowed) ──

export const signup = async (req, res) => {
  try {
    const { password, fullName } = req.body;
    // Always store username in lowercase to ensure consistent login
    const username = (req.body.username || '').trim().toLowerCase();

    // Check if an owner already exists
    const ownerSnap = await db.collection('users').where('role', '==', 'owner').limit(1).get();
    if (!ownerSnap.empty) {
      return errorResponse(res, 'Owner account already exists. Only one owner is allowed.', 409);
    }

    // Check if username is taken
    const usernameSnap = await db.collection('users').where('username', '==', username).limit(1).get();
    if (!usernameSnap.empty) {
      return errorResponse(res, 'Username already taken.', 409);
    }

    // Hash password
    const salt = await bcrypt.genSalt(12);
    const passwordHash = await bcrypt.hash(password, salt);

    const userId = generateId('USR');
    const userData = {
      id: userId,
      username,
      passwordHash,
      role: 'owner',
      fullName,
      isActive: true,
      createdAt: nowISO(),
    };

    await db.collection('users').doc(userId).set(userData);

    // Generate JWT
    const token = jwt.sign(
      { id: userId, username, role: 'owner' },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    // Don't return the password hash
    const { passwordHash: _, ...safeUser } = userData;

    return successResponse(res, { user: safeUser, token }, 'Owner account created successfully.', 201);
  } catch (error) {
    console.error('Signup error:', error);
    return errorResponse(res, 'Failed to create account.');
  }
};

// ── POST /api/auth/login — Login (owner or worker) ──────────

export const login = async (req, res) => {
  try {
    const { password } = req.body;
    // Normalize to lowercase so login works regardless of what the client sends
    const normalizedUsername = (req.body.username || '').trim().toLowerCase();

    // Find user by username
    const userSnap = await db.collection('users').where('username', '==', normalizedUsername).limit(1).get();
    if (userSnap.empty) {
      return errorResponse(res, 'Invalid username or password.', 401);
    }

    const userDoc = userSnap.docs[0];
    const userData = userDoc.data();

    // Check if account is active
    if (!userData.isActive) {
      return errorResponse(res, 'Account is deactivated. Contact the owner.', 403);
    }

    // Compare password
    const isMatch = await bcrypt.compare(password, userData.passwordHash);
    if (!isMatch) {
      return errorResponse(res, 'Invalid username or password.', 401);
    }

    // Generate JWT
    const token = jwt.sign(
      { id: userData.id, username: userData.username, role: userData.role },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    const { passwordHash: _, ...safeUser } = userData;

    return successResponse(res, { user: safeUser, token }, 'Login successful.');
  } catch (error) {
    console.error('Login error:', error);
    return errorResponse(res, 'Login failed.');
  }
};

// ── GET /api/auth/me — Get current user profile ─────────────

export const getMe = async (req, res) => {
  try {
    const userDoc = await db.collection('users').doc(req.user.id).get();
    if (!userDoc.exists) {
      return errorResponse(res, 'User not found.', 404);
    }

    const userData = userDoc.data();
    const { passwordHash: _, ...safeUser } = userData;

    // If the user is a worker, attach their worker profile
    let workerProfile = null;
    if (userData.role === 'worker') {
      const workerSnap = await db.collection('workers').where('userId', '==', userData.id).limit(1).get();
      if (!workerSnap.empty) {
        workerProfile = workerSnap.docs[0].data();
      }
    }

    return successResponse(res, { user: safeUser, workerProfile }, 'Profile retrieved.');
  } catch (error) {
    console.error('GetMe error:', error);
    return errorResponse(res, 'Failed to retrieve profile.');
  }
};
