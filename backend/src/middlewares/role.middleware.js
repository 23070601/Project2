const { ApiError } = require('../shared/utils/responseWrapper');

// Dùng sau authenticate: requireRole('Manager') hoặc requireRole('Manager', 'Technician')
function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return next(new ApiError(401, 'Not authenticated'));
    }
    if (!allowedRoles.includes(req.user.role)) {
      return next(new ApiError(403, `Role "${req.user.role}" is not allowed to access this resource`));
    }
    next();
  };
}

module.exports = { requireRole };
