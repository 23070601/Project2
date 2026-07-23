const { ApiError } = require('./responseWrapper');

// Validation module using ENGLISH error messages for the web application.

function requireFields(body, fields) {
  const missing = fields.filter((f) => body[f] === undefined || body[f] === null || body[f] === '');
  if (missing.length > 0) {
    throw new ApiError(400, `Missing required field(s): ${missing.join(', ')}`);
  }
}

function requireOneOf(value, allowed, fieldName) {
  if (!allowed.includes(value)) {
    throw new ApiError(400, `Invalid value for "${fieldName}". Allowed: ${allowed.join(', ')}`);
  }
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email).trim());
}

function toPositiveInt(value, fieldName) {
  const n = Number(value);
  if (!Number.isInteger(n) || n <= 0) {
    throw new ApiError(400, `"${fieldName}" must be a positive integer`);
  }
  return n;
}

// ===== SCHEMAS ALIGNED WITH INS328201-Project II - Cons&Vali.pdf (ENGLISH) =====

/**
 * 1. loginSchema
 */
function validateLogin(body) {
  const { email, password, role } = body || {};
  if (!email || !isValidEmail(email) || !password || String(password).length < 6 || !role) {
    throw new ApiError(400, 'Invalid email or password. Please check your credentials.');
  }
  requireOneOf(role, ['User', 'Technician', 'Manager'], 'role');
}

/**
 * 2. createReportSchema
 */
function validateCreateReport(body) {
  const { description } = body || {};
  if (!description || String(description).trim().length < 5 || String(description).trim().length > 1000) {
    throw new ApiError(400, 'Description must be between 5 and 1000 characters.');
  }
}

/**
 * 3. createUserSchema
 */
function validateCreateUser(body) {
  const { full_name, email, role, technician_specialty } = body || {};
  if (!full_name || String(full_name).trim().length < 2 || String(full_name).trim().length > 100) {
    throw new ApiError(400, 'Full name must be at least 2 characters.');
  }
  if (!email || !isValidEmail(email)) {
    throw new ApiError(400, 'Invalid email address format.');
  }
  if (role === 'Technician' && (!technician_specialty || !String(technician_specialty).trim())) {
    throw new ApiError(400, 'Technician specialty is required for Technician role.');
  }
}

/**
 * 4. updateTaskStatusSchema
 */
function validateUpdateTaskStatus(body) {
  const { task_status, fix_description } = body || {};
  if (task_status === 'Completed' && (!fix_description || !String(fix_description).trim())) {
    throw new ApiError(400, 'Fix description is required when completing repair task.');
  }
}

/**
 * 5. rejectWorkOrderSchema
 */
function validateRejectWorkOrder(body) {
  const { rejection_reason } = body || {};
  if (!rejection_reason || String(rejection_reason).trim().length < 5) {
    throw new ApiError(400, 'Rejection reason must be at least 5 characters.');
  }
}

/**
 * 6. updateProfileSchema
 */
function validateUpdateProfile(body) {
  const { phone } = body || {};
  if (phone !== undefined && phone !== null && phone !== '') {
    if (!/^\d{10}$/.test(String(phone).trim())) {
      throw new ApiError(400, 'Phone number must contain exactly 10 digits.');
    }
  }
}

/**
 * 7. changePasswordSchema
 */
function validateChangePassword(body) {
  const { old_password, new_password, confirm_password } = body || {};
  if (!old_password) {
    throw new ApiError(400, 'Please enter your current password.');
  }
  if (!new_password || String(new_password).length < 6) {
    throw new ApiError(400, 'New password must be at least 6 characters.');
  }
  if (confirm_password !== new_password) {
    throw new ApiError(400, 'Confirmation password does not match.');
  }
}

module.exports = {
  requireFields,
  requireOneOf,
  isValidEmail,
  toPositiveInt,
  validateLogin,
  validateCreateReport,
  validateCreateUser,
  validateUpdateTaskStatus,
  validateRejectWorkOrder,
  validateUpdateProfile,
  validateChangePassword,
};
