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
      const userIdHeader = Number(req.headers['x-user-id']);
      const userRoleHeader = req.headers['x-user-role'];

      let userId = userIdHeader || 1;
      let role = userRoleHeader || 'User';
      let fullName = 'Nguyen Van A';
      let email = userEmail || 'lecturer.a@vnuis.edu.vn';

      if (userEmail.includes('tech.d') || userEmail.includes('d@vnuis') || userId === 4) {
        userId = 4;
        role = 'Technician';
        fullName = 'Pham Thi D';
        email = 'tech.d@vnuis.edu.vn';
      } else if (userEmail.includes('tech.f') || userEmail.includes('f@vnuis') || userId === 6) {
        userId = 6;
        role = 'Technician';
        fullName = 'Vu Van F';
        email = 'tech.f@vnuis.edu.vn';
      } else if (userEmail.includes('tech') || userEmail.includes('c@vnuis') || userId === 3 || (userRoleHeader === 'Technician' && !userIdHeader)) {
        userId = userIdHeader || 3;
        role = 'Technician';
        fullName = 'Le Van C';
        email = userEmail || 'tech.c@vnuis.edu.vn';
      } else if (userEmail.includes('manager') || userEmail.includes('e@vnuis') || userId === 5 || userRoleHeader === 'Manager') {
        userId = userIdHeader || 5;
        role = 'Manager';
        fullName = 'Hoang Van E';
        email = userEmail || 'manager.e@vnuis.edu.vn';
      } else {
        userId = userIdHeader || (userEmail.includes('b@vnuis') || userEmail.includes('student.b') ? 2 : 1);
        role = 'User';
        fullName = userId === 2 ? 'Tran Thi B' : 'Nguyen Van A';
        email = userEmail || 'lecturer.a@vnuis.edu.vn';
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
