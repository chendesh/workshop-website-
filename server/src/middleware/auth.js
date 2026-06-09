/**
 * Authentication Middleware
 * -------------------------
 * Verifies JWT token from the Authorization header and attaches the
 * decoded user payload to `req.user`.
 */

import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'default_dev_secret';

/**
 * Middleware: Authenticate incoming requests via Bearer token.
 */
export const authenticate = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        data: null,
        message: 'Access denied. No token provided.',
      });
    }

    const token = authHeader.split(' ')[1];

    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded; // { id, username, role }
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        data: null,
        message: 'Token has expired. Please login again.',
      });
    }
    return res.status(401).json({
      success: false,
      data: null,
      message: 'Invalid token.',
    });
  }
};
