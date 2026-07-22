const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const env = require('../../config/env');
const { pool } = require('../../config/db');
const { ApiError } = require('../../shared/utils/responseWrapper');
const auditLogRepository = require('../auditLog/auditLog.repository');

function signToken(user) {
  return jwt.sign(
    { sub: user.user_id, role: user.role, fullName: user.full_name, email: user.email },
    env.jwt.secret,
    { expiresIn: env.jwt.expiresIn }
  );
}

function toSafeUser(user) {
  // Không bao giờ trả password_hash ra ngoài
  const { password_hash, ...safe } = user;
  return safe;
}

async function login(email, password) {
  const [rows] = await pool.execute(
    'SELECT * FROM Users WHERE email = ? LIMIT 1',
    [email]
  );
  const user = rows[0];

  if (!user || !user.is_active) {
    throw new ApiError(401, 'Invalid email or password');
  }

  const matches = await bcrypt.compare(password, user.password_hash);
  if (!matches) {
    throw new ApiError(401, 'Invalid email or password');
  }

  const token = signToken(user);
  await auditLogRepository.log({
    userId: user.user_id,
    actionType: 'LOGIN',
    entityTable: 'Users',
    entityId: user.user_id,
    description: `User ${user.email} logged in`,
  });

  return { token, user: toSafeUser(user) };
}

async function changePassword(userId, currentPassword, newPassword) {
  const [rows] = await pool.execute('SELECT * FROM Users WHERE user_id = ?', [userId]);
  const user = rows[0];
  if (!user) throw new ApiError(404, 'User not found');

  const matches = await bcrypt.compare(currentPassword, user.password_hash);
  if (!matches) throw new ApiError(400, 'Current password is incorrect');

  const newHash = await bcrypt.hash(newPassword, env.bcryptSaltRounds);
  await pool.execute('UPDATE Users SET password_hash = ? WHERE user_id = ?', [newHash, userId]);

  await auditLogRepository.log({
    userId,
    actionType: 'UPDATE',
    entityTable: 'Users',
    entityId: userId,
    description: 'User changed their own password',
  });
}

async function getMe(userId) {
  const [rows] = await pool.execute('SELECT * FROM Users WHERE user_id = ?', [userId]);
  if (!rows[0]) throw new ApiError(404, 'User not found');
  return toSafeUser(rows[0]);
}

module.exports = { login, changePassword, getMe, toSafeUser };
