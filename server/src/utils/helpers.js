/**
 * Utility Helpers
 * ----------------
 * Shared helper functions: ID generators, date formatters, currency formatter.
 */

import crypto from 'crypto';

// ── ID Generators ──────────────────────────────────────────────

/**
 * Generate a short unique ID with an optional prefix.
 * @param {string} prefix - e.g. 'WRK', 'ATT', 'WL'
 * @returns {string} e.g. 'WRK-a3f9b2c1'
 */
export const generateId = (prefix = '') => {
  const hex = crypto.randomBytes(4).toString('hex');
  return prefix ? `${prefix}-${hex}` : hex;
};

// ── Date Helpers ───────────────────────────────────────────────

/**
 * Format a JS Date to DD/MM/YYYY string.
 * @param {Date} date
 * @returns {string}
 */
export const formatDate = (date) => {
  const d = new Date(date);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
};

/**
 * Parse a DD/MM/YYYY string into a JS Date.
 * @param {string} dateStr
 * @returns {Date}
 */
export const parseDate = (dateStr) => {
  if (dateStr.includes('-')) {
    const [year, month, day] = dateStr.split('-').map(Number);
    return new Date(year, month - 1, day);
  }
  const [day, month, year] = dateStr.split('/').map(Number);
  return new Date(year, month - 1, day);
};

/**
 * Get today's date as DD/MM/YYYY.
 * @returns {string}
 */
export const todayStr = () => formatDate(new Date());

/**
 * Get current ISO timestamp.
 * @returns {string}
 */
export const nowISO = () => new Date().toISOString();

/**
 * Get the Monday of the week containing the given date.
 * @param {Date} date
 * @returns {Date}
 */
export const getWeekStart = (date) => {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
};

/**
 * Get the Sunday of the week containing the given date.
 * @param {Date} date
 * @returns {Date}
 */
export const getWeekEnd = (date) => {
  const start = getWeekStart(date);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return end;
};

// ── Currency ───────────────────────────────────────────────────

/**
 * Format a number as Indian Rupees string.
 * @param {number} amount
 * @returns {string} e.g. '₹1,25,000.00'
 */
export const formatRupees = (amount) => {
  const num = Number(amount) || 0;
  return '₹' + num.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

// ── Username Generator ─────────────────────────────────────────

/**
 * Generate a username from a full name.
 * e.g. "Ravi Kumar" → "ravi.kumar"
 * @param {string} fullName
 * @returns {string}
 */
export const generateUsername = (fullName) => {
  return fullName
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '.')
    .replace(/[^a-z0-9.]/g, '');
};

/**
 * Generate a random temporary password.
 * @param {number} length
 * @returns {string}
 */
export const generateTempPassword = (length = 8) => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  let password = '';
  for (let i = 0; i < length; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
};

// ── Response Helpers ───────────────────────────────────────────

/**
 * Standardized success response.
 */
export const successResponse = (res, data, message = 'Success', statusCode = 200) => {
  return res.status(statusCode).json({
    success: true,
    data,
    message,
  });
};

/**
 * Standardized error response.
 */
export const errorResponse = (res, message = 'Something went wrong', statusCode = 500, data = null) => {
  return res.status(statusCode).json({
    success: false,
    data,
    message,
  });
};
