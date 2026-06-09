/**
 * Input Validation Middleware
 * ----------------------------
 * Lightweight validation helpers for request bodies.
 * Each validator returns a middleware function.
 */

/**
 * Validate that required fields exist in req.body.
 * @param {string[]} fields - Array of required field names.
 */
export const requireFields = (fields) => {
  return (req, res, next) => {
    const missing = fields.filter((f) => {
      const value = req.body[f];
      return value === undefined || value === null || value === '';
    });

    if (missing.length > 0) {
      return res.status(400).json({
        success: false,
        data: null,
        message: `Missing required fields: ${missing.join(', ')}`,
      });
    }

    next();
  };
};

/**
 * Validate phone number format (Indian 10-digit).
 */
export const validatePhone = (fieldName = 'phone') => {
  return (req, res, next) => {
    const phone = req.body[fieldName];
    if (phone && !/^[6-9]\d{9}$/.test(phone)) {
      return res.status(400).json({
        success: false,
        data: null,
        message: `Invalid phone number. Must be a 10-digit Indian mobile number.`,
      });
    }
    next();
  };
};

/**
 * Validate that a field is a positive number.
 */
export const validatePositiveNumber = (...fieldNames) => {
  return (req, res, next) => {
    for (const field of fieldNames) {
      const value = req.body[field];
      if (value !== undefined && value !== null && value !== '') {
        const num = Number(value);
        if (isNaN(num) || num < 0) {
          return res.status(400).json({
            success: false,
            data: null,
            message: `Field '${field}' must be a positive number.`,
          });
        }
      }
    }
    next();
  };
};

/**
 * Validate date string format (DD/MM/YYYY).
 */
export const validateDateFormat = (...fieldNames) => {
  return (req, res, next) => {
    const dateRegex = /^(0[1-9]|[12]\d|3[01])\/(0[1-9]|1[0-2])\/\d{4}$/;
    for (const field of fieldNames) {
      const value = req.body[field];
      if (value && !dateRegex.test(value)) {
        return res.status(400).json({
          success: false,
          data: null,
          message: `Field '${field}' must be in DD/MM/YYYY format.`,
        });
      }
    }
    next();
  };
};

/**
 * Validate enum values.
 * @param {string} field - Field name.
 * @param {string[]} allowed - Allowed values.
 */
export const validateEnum = (field, allowed) => {
  return (req, res, next) => {
    const value = req.body[field];
    if (value && !allowed.includes(value)) {
      return res.status(400).json({
        success: false,
        data: null,
        message: `Invalid value for '${field}'. Allowed: ${allowed.join(', ')}`,
      });
    }
    next();
  };
};
