const { pool } = require('../../config/db');

async function findAll({ building, floorNumber, search } = {}) {
  const clauses = [];
  const params = [];

  if (building) { clauses.push('building = ?'); params.push(building); }
  if (floorNumber !== undefined) { clauses.push('floor_number = ?'); params.push(floorNumber); }
  if (search) { clauses.push('room_name LIKE ?'); params.push(`%${search}%`); }

  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
  const [rows] = await pool.query(
    `SELECT c.*,
            (SELECT COUNT(*) FROM Assets a WHERE a.room_id = c.room_id) AS asset_count
     FROM Classrooms c ${where} ORDER BY c.building, c.floor_number, c.room_name`,
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

async function create({ roomName, building = null, floorNumber = null, qrCode = null }) {
  const [result] = await pool.execute(
    'INSERT INTO Classrooms (room_name, qr_code, building, floor_number) VALUES (?, ?, ?, ?)',
    [roomName, qrCode, building, floorNumber]
  );
  return findById(result.insertId);
}

async function update(roomId, { roomName, building, floorNumber }) {
  const fields = [];
  const params = [];
  if (roomName !== undefined) { fields.push('room_name = ?'); params.push(roomName); }
  if (building !== undefined) { fields.push('building = ?'); params.push(building); }
  if (floorNumber !== undefined) { fields.push('floor_number = ?'); params.push(floorNumber); }

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
