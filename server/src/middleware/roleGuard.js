/**
 * Role Guard Middleware
 * ---------------------
 * Restricts access to routes based on user role.
 * Must be used AFTER the `authenticate` middleware.
 */

/**
 * Factory: Returns middleware that allows only specified roles.
 * @param  {...string} roles - Allowed roles (e.g. 'owner', 'worker')
 */
export const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        data: null,
        message: 'Authentication required.',
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        data: null,
        message: `Access denied. Required role: ${roles.join(' or ')}.`,
      });
    }

    next();
  };
};

/**
 * Shortcut: Owner-only access.
 */
export const requireOwner = requireRole('owner');
