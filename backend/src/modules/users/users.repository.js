const { pool } = require('../../config/db');

const SAFE_COLUMNS = `user_id, full_name, email, role, phone, technician_specialty, is_active, created_at`;

async function findAll({ role, isActive, search } = {}) {
  const clauses = [];
  const params = [];

  if (role) {
    clauses.push('role = ?');
    params.push(role);
  }
  if (isActive !== undefined) {
    clauses.push('is_active = ?');
    params.push(isActive ? 1 : 0);
  }
  if (search) {
    clauses.push('(full_name LIKE ? OR email LIKE ?)');
    params.push(`%${search}%`, `%${search}%`);
  }

  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
  const [rows] = await pool.query(
    `SELECT ${SAFE_COLUMNS} FROM Users ${where} ORDER BY created_at DESC`,
    params
  );
  return rows;
}

async function findById(userId) {
  const [rows] = await pool.execute(`SELECT ${SAFE_COLUMNS} FROM Users WHERE user_id = ?`, [userId]);
  return rows[0] || null;
}

async function findByEmail(email) {
  const [rows] = await pool.execute('SELECT * FROM Users WHERE email = ?', [email]);
  return rows[0] || null;
}

async function create({ fullName, email, passwordHash, role, phone = null, technicianSpecialty = null }) {
  const [result] = await pool.execute(
    `INSERT INTO Users (full_name, email, password_hash, role, phone, technician_specialty)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [fullName, email, passwordHash, role, phone, technicianSpecialty]
  );
  return findById(result.insertId);
}

async function update(userId, { fullName, phone, technicianSpecialty, isActive }) {
  const fields = [];
  const params = [];

  if (fullName !== undefined) { fields.push('full_name = ?'); params.push(fullName); }
  if (phone !== undefined) { fields.push('phone = ?'); params.push(phone); }
  if (technicianSpecialty !== undefined) { fields.push('technician_specialty = ?'); params.push(technicianSpecialty); }
  if (isActive !== undefined) { fields.push('is_active = ?'); params.push(isActive ? 1 : 0); }

  if (fields.length === 0) return findById(userId);

  params.push(userId);
  await pool.execute(`UPDATE Users SET ${fields.join(', ')} WHERE user_id = ?`, params);
  return findById(userId);
}

async function updatePasswordHash(userId, passwordHash) {
  await pool.execute('UPDATE Users SET password_hash = ? WHERE user_id = ?', [passwordHash, userId]);
}

async function remove(userId) {
  // Soft delete để không phá vỡ ràng buộc FK với FaultReports/WorkOrders cũ
  await pool.execute('UPDATE Users SET is_active = FALSE WHERE user_id = ?', [userId]);
}

async function listTechnicians() {
  const [rows] = await pool.query(
    `SELECT ${SAFE_COLUMNS} FROM Users WHERE role = 'Technician' AND is_active = TRUE ORDER BY full_name`
  );
  return rows;
}

module.exports = {
  findAll,
  findById,
  findByEmail,
  create,
  update,
  updatePasswordHash,
  remove,
  listTechnicians,
};
