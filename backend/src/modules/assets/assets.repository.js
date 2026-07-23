const { pool } = require('../../config/db');

async function findAll({ roomId, assetType, status, search } = {}) {
  const clauses = [];
  const params = [];

  if (roomId) { clauses.push('a.room_id = ?'); params.push(roomId); }
  if (assetType) { clauses.push('a.asset_type = ?'); params.push(assetType); }
  if (status) { clauses.push('a.status = ?'); params.push(status); }
  if (search) { clauses.push('a.asset_name LIKE ?'); params.push(`%${search}%`); }

  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
  const [rows] = await pool.query(
    `SELECT a.*, c.room_name, c.building
     FROM Assets a
     JOIN Classrooms c ON c.room_id = a.room_id
     ${where}
     ORDER BY a.status = 'Recommended for Replacement' DESC, a.failure_count DESC, a.asset_name`,
    params
  );
  return rows;
}

async function findById(assetId) {
  const [rows] = await pool.execute(
    `SELECT a.*, c.room_name, c.building
     FROM Assets a JOIN Classrooms c ON c.room_id = a.room_id
     WHERE a.asset_id = ?`,
    [assetId]
  );
  return rows[0] || null;
}

async function create({ assetName, assetType, roomId, status = 'Operational' }) {
  const [result] = await pool.execute(
    'INSERT INTO Assets (asset_name, asset_type, room_id, status) VALUES (?, ?, ?, ?)',
    [assetName, assetType, roomId, status]
  );
  return findById(result.insertId);
}

async function update(assetId, { assetName, assetType, roomId, status }) {
  const fields = [];
  const params = [];
  if (assetName !== undefined) { fields.push('asset_name = ?'); params.push(assetName); }
  if (assetType !== undefined) { fields.push('asset_type = ?'); params.push(assetType); }
  if (roomId !== undefined) { fields.push('room_id = ?'); params.push(roomId); }
  if (status !== undefined) { fields.push('status = ?'); params.push(status); }

  if (fields.length === 0) return findById(assetId);
  params.push(assetId);
  await pool.execute(`UPDATE Assets SET ${fields.join(', ')} WHERE asset_id = ?`, params);
  return findById(assetId);
}

async function remove(assetId) {
  await pool.execute('DELETE FROM Assets WHERE asset_id = ?', [assetId]);
}

// DSS3: danh sách thiết bị vượt ngưỡng hỏng hóc (dùng view có sẵn trong schema)
async function findReplacementAlerts() {
  const [rows] = await pool.query('SELECT * FROM v_dss3_replacement_alerts');
  return rows;
}

module.exports = { findAll, findById, create, update, remove, findReplacementAlerts };
