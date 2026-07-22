const jwt = require('jsonwebtoken');
const env = require('../config/env');
const { ApiError } = require('../shared/utils/responseWrapper');

// Đọc "Authorization: Bearer <token>", verify JWT, gắn req.user = { userId, role, fullName }
function authenticate(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    const [scheme, token] = header.split(' ');

    if (scheme !== 'Bearer' || !token) {
      throw new ApiError(401, 'Missing or malformed Authorization header');
    }

    const payload = jwt.verify(token, env.jwt.secret);
    req.user = {
      userId: payload.sub,
      role: payload.role,
      fullName: payload.fullName,
      email: payload.email,
    };
    next();
  } catch (err) {
    if (err instanceof ApiError) return next(err);
    next(new ApiError(401, 'Invalid or expired token'));
  }
}

module.exports = { authenticate };
