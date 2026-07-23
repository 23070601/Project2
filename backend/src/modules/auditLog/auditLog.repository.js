const { pool } = require('../../config/db');

/**
 * Ghi 1 dòng AuditLog thủ công.
 * Lưu ý: trigger DB đã tự ghi AuditLog cho INSERT vào FaultReports.
 * Ở đây dùng cho các hành động KHÔNG có trigger tự động, ví dụ:
 * CRUD Classrooms/Users/Assets, export report, approve/reject...
 */
async function log({ userId = null, actionType, entityTable, entityId = null, roomId = null, assetId = null, description = null }) {
  await pool.execute(
    `INSERT INTO AuditLog (user_id, action_type, entity_table, entity_id, room_id, asset_id, description)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [userId, actionType, entityTable, entityId, roomId, assetId, description]
  );
}

async function list({ entityTable, userId, limit = 100, offset = 0 } = {}) {
  const clauses = [];
  const params = [];

  if (entityTable) {
    clauses.push('entity_table = ?');
    params.push(entityTable);
  }
  if (userId) {
    clauses.push('user_id = ?');
    params.push(userId);
  }

  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
  const [rows] = await pool.query(
    `SELECT * FROM AuditLog ${where} ORDER BY action_at DESC LIMIT ? OFFSET ?`,
    [...params, Number(limit), Number(offset)]
  );
  return rows;
}

module.exports = { log, list };
