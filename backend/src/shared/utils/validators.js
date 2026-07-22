const { ApiError } = require('./responseWrapper');

// Bộ validate tối giản, đủ dùng cho đồ án - không kéo thêm thư viện ngoài.

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
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email));
}

function toPositiveInt(value, fieldName) {
  const n = Number(value);
  if (!Number.isInteger(n) || n <= 0) {
    throw new ApiError(400, `"${fieldName}" must be a positive integer`);
  }
  return n;
}

module.exports = { requireFields, requireOneOf, isValidEmail, toPositiveInt };
