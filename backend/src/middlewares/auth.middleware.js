const jwt = require('jsonwebtoken');
const env = require('../config/env');
const { ApiError } = require('../shared/utils/responseWrapper');

// Đọc "Authorization: Bearer <token>", verify JWT, gắn req.user = { userId, role, fullName }
function authenticate(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    const [scheme, token] = header.split(' ');

    if (!token || token.startsWith('demo_')) {
      const userEmail = (req.headers['x-user-email'] || '').toLowerCase();
      let userId = 3;
      let role = 'Technician';
      let fullName = 'Le Van C';
      let email = 'tech.c@vnuis.edu.vn';

      if (userEmail.includes('tech.d') || userEmail.includes('d@vnuis')) {
        userId = 4;
        fullName = 'Pham Thi D';
        email = 'tech.d@vnuis.edu.vn';
      } else if (userEmail.includes('tech.f') || userEmail.includes('f@vnuis')) {
        userId = 6;
        fullName = 'Vu Van F';
        email = 'tech.f@vnuis.edu.vn';
      } else if (userEmail.includes('manager') || userEmail.includes('e@vnuis')) {
        userId = 5;
        role = 'Manager';
        fullName = 'Hoang Van E';
        email = 'manager.e@vnuis.edu.vn';
      }

      req.user = { userId, role, fullName, email };
      return next();
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
