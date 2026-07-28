function toCamelCase(key) {
  return key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
}

function normalizeRequestBody(req, res, next) {
  if (req.body && typeof req.body === 'object' && !Array.isArray(req.body)) {
    const normalized = {};
    Object.entries(req.body).forEach(([key, value]) => {
      normalized[toCamelCase(key)] = value;
    });
    req.body = normalized;
  }
  next();
}

module.exports = { normalizeRequestBody };
