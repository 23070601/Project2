const { pool } = require('../../config/db');

async function findAll({ search } = {}) {
  const clauses = [];
  const params = [];

  if (search) {
    clauses.push('room_name LIKE ?');
    params.push(`%${search}%`);
  }

  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
  const [rows] = await pool.query(
    `SELECT c.*,
            (SELECT COUNT(*) FROM Assets a WHERE a.room_id = c.room_id) AS asset_count
     FROM Classrooms c ${where} ORDER BY c.room_name`,
    params
  );
  return rows;
}

async function findById(roomId) {
  const [rows] = await pool.execute('SELECT * FROM Classrooms WHERE room_id = ?', [roomId]);
  return rows[0] || null;
}

async function findByName(roomName) {
  const [rows] = await pool.execute('SELECT * FROM Classrooms WHERE room_name = ?', [roomName]);
  return rows[0] || null;
}

async function create({ roomName, qrCode = null }) {
  const [result] = await pool.execute(
    'INSERT INTO Classrooms (room_name, qr_code) VALUES (?, ?)',
    [roomName, qrCode]
  );
  return findById(result.insertId);
}

async function update(roomId, { roomName, qrCode }) {
  const fields = [];
  const params = [];
  if (roomName !== undefined) { fields.push('room_name = ?'); params.push(roomName); }
  if (qrCode !== undefined) { fields.push('qr_code = ?'); params.push(qrCode); }

  if (fields.length === 0) return findById(roomId);
  params.push(roomId);
  await pool.execute(`UPDATE Classrooms SET ${fields.join(', ')} WHERE room_id = ?`, params);
  return findById(roomId);
}

async function updateQrCode(roomId, qrCode) {
  await pool.execute('UPDATE Classrooms SET qr_code = ? WHERE room_id = ?', [qrCode, roomId]);
  return findById(roomId);
}

async function remove(roomId) {
  await pool.execute('DELETE FROM Classrooms WHERE room_id = ?', [roomId]);
}

module.exports = { findAll, findById, findByName, create, update, updateQrCode, remove };
