const { ApiError } = require('../shared/utils/responseWrapper');

// 404 cho route không tồn tại
function notFoundHandler(req, res, next) {
  next(new ApiError(404, `Route not found: ${req.method} ${req.originalUrl}`));
}

// Handler lỗi tập trung - mọi controller chỉ cần throw ApiError hoặc next(err)
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  let status = err instanceof ApiError ? err.status : (err.status || err.statusCode || 500);
  let message = err.message;

  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    status = 400;
    message = 'Invalid JSON body payload';
  } else if (status === 500) {
    message = 'Internal server error';
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
