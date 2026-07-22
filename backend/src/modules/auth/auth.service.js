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

  let matches = false;
  try {
    matches = await bcrypt.compare(password, user.password_hash);
  } catch (err) {
    matches = false;
  }

  // Hỗ trợ nếu mật khẩu chưa từng đổi và password_hash trong SQL còn là hash_placeholder
  if (!matches && user.password_hash.startsWith('hash_placeholder') && password === '123456') {
    matches = true;
  }

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

  let matches = false;
  try {
    matches = await bcrypt.compare(currentPassword, user.password_hash);
  } catch (err) {
    matches = false;
  }

  // Hỗ trợ nếu mật khẩu cũ trong DB là hash_placeholder hoặc nhập 123456
  if (!matches && (user.password_hash.startsWith('hash_placeholder') || currentPassword === '123456')) {
    matches = true;
  }

  if (!matches) throw new ApiError(400, 'Current password is incorrect');

  const saltRounds = env.bcryptSaltRounds || 10;
  const newHash = await bcrypt.hash(newPassword, saltRounds);
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

// THÊM SERVICE MỚI: Cập nhật profile
async function updateProfile(userId, data) {
  // Lấy thông tin user hiện tại
  const [rows] = await pool.execute('SELECT * FROM Users WHERE user_id = ?', [userId]);
  if (!rows[0]) throw new ApiError(404, 'User not found');
  
  // Xây dựng câu lệnh UPDATE động
  const updates = [];
  const values = [];
  
  if (data.phone !== undefined && data.phone !== null) {
    updates.push('phone = ?');
    values.push(data.phone);
  }
  
  if (data.full_name !== undefined && data.full_name !== null) {
    updates.push('full_name = ?');
    values.push(data.full_name);
  }
  
  if (data.department !== undefined && data.department !== null) {
    updates.push('department = ?');
    values.push(data.department);
  }
  
  if (updates.length === 0) {
    throw new ApiError(400, 'No fields to update');
  }
  
  values.push(userId);
  const query = `UPDATE Users SET ${updates.join(', ')} WHERE user_id = ?`;
  
  await pool.execute(query, values);
  
  // Ghi audit log
  await auditLogRepository.log({
    userId,
    actionType: 'UPDATE',
    entityTable: 'Users',
    entityId: userId,
    description: `User updated their profile: ${updates.join(', ')}`,
  });
  
  // Lấy thông tin user đã cập nhật
  return await getMe(userId);
}

module.exports = { 
  login, 
  changePassword, 
  getMe, 
  toSafeUser,
  updateProfile  // Export hàm mới
};