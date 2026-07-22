const authService = require('./auth.service');
const { ok, noContent } = require('../../shared/utils/responseWrapper');
const { requireFields, isValidEmail } = require('../../shared/utils/validators');
const { ApiError } = require('../../shared/utils/responseWrapper');

async function login(req, res) {
  requireFields(req.body, ['email', 'password']);
  const { email, password } = req.body;
  if (!isValidEmail(email)) throw new ApiError(400, 'Invalid email format');

  const result = await authService.login(email, password);
  ok(res, result);
}

async function me(req, res) {
  const user = await authService.getMe(req.user.userId);
  ok(res, user);
}

async function changePassword(req, res) {
  requireFields(req.body, ['currentPassword', 'newPassword']);
  const { currentPassword, newPassword } = req.body;
  if (String(newPassword).length < 6) {
    throw new ApiError(400, 'New password must be at least 6 characters long');
  }
  await authService.changePassword(req.user.userId, currentPassword, newPassword);
  noContent(res);
}

module.exports = { login, me, changePassword };
