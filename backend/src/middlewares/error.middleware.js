const { ApiError } = require('../shared/utils/responseWrapper');

// 404 cho route không tồn tại
function notFoundHandler(req, res, next) {
  next(new ApiError(404, `Route not found: ${req.method} ${req.originalUrl}`));
}

// Handler lỗi tập trung - mọi controller chỉ cần throw ApiError hoặc next(err)
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  const status = err instanceof ApiError ? err.status : 500;
  const message = status === 500 ? 'Internal server error' : err.message;

  if (status === 500) {
    console.error('[UNHANDLED ERROR]', err);
  }

  res.status(status).json({
    success: false,
    error: {
      message,
      details: err instanceof ApiError ? err.details : undefined,
    },
  });
}

module.exports = { notFoundHandler, errorHandler };
