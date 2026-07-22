// Chuẩn hoá format response cho toàn bộ API, để frontend (api.js) xử lý đồng nhất.

function ok(res, data, meta = undefined, status = 200) {
  return res.status(status).json({ success: true, data, meta });
}

function created(res, data) {
  return ok(res, data, undefined, 201);
}

function noContent(res) {
  return res.status(204).send();
}

class ApiError extends Error {
  constructor(status, message, details = undefined) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

module.exports = { ok, created, noContent, ApiError };
