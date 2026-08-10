const { pool } = require('../../config/db');

async function findAll({ roomId, assetType, status, search } = {}) {
  const clauses = [];
  const params = [];

  if (roomId) { clauses.push('a.room_id = ?'); params.push(roomId); }
  if (assetType) { clauses.push('a.asset_type = ?'); params.push(assetType); }
  if (status && status !== 'All') {
    clauses.push('a.status = ?');
    params.push(status);
  } else if (!status) {
    clauses.push("a.status != 'Inactive'");
  }
  if (search) { clauses.push('a.asset_name LIKE ?'); params.push(`%${search}%`); }

  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
  const [rows] = await pool.query(
    `SELECT a.*, c.room_name
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
    `SELECT a.*, c.room_name
     FROM Assets a JOIN Classrooms c ON c.room_id = a.room_id
     WHERE a.asset_id = ?`,
    [assetId]
  );
  const asset = rows[0] || null;
  if (asset) {
    try {
      const [historyRows] = await pool.execute(
        `SELECT wo.*, tech.full_name AS technician_name, fr.description AS reported_issue
         FROM WorkOrders wo
         JOIN FaultReports fr ON fr.report_id = wo.report_id
         LEFT JOIN Users tech ON tech.user_id = wo.technician_id
         WHERE fr.asset_id = ?
         ORDER BY wo.assigned_at DESC`,
        [assetId]
      );
      asset.repairHistory = historyRows;
    } catch (e) {
      console.log('Error fetching asset repair history', e);
    }
  }
  return asset;
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

async function hasActiveWorkOrder(assetId) {
  const [rows] = await pool.query(
    `SELECT wo.order_id
     FROM WorkOrders wo
     JOIN FaultReports fr ON fr.report_id = wo.report_id
     WHERE fr.asset_id = ?
       AND wo.task_status IN ('Assigned', 'Received', 'In Progress')`,
    [assetId]
  );
  return rows.length > 0;
}

async function remove(assetId) {
  // Requirement 1 & 6: Soft deactivation (never DELETE FROM Assets)
  await pool.execute("UPDATE Assets SET status = 'Inactive' WHERE asset_id = ?", [assetId]);
}

// DSS3: danh sách thiết bị vượt ngưỡng hỏng hóc (dùng view có sẵn trong schema)
async function findReplacementAlerts() {
  const [rows] = await pool.query('SELECT * FROM v_dss3_replacement_alerts');
  return rows;
}

// All Assets tab: trả về tất cả assets kèm số lần hỏng trong 3 tháng gần nhất và tổng số lần hỏng
async function findAllWithFailures({ assetType, roomId, status, search } = {}) {
  const clauses = [];
  const params = [];

  if (assetType) { clauses.push('a.asset_type = ?'); params.push(assetType); }
  if (roomId) { clauses.push('a.room_id = ?'); params.push(roomId); }
  if (status === 'Critical') {
    clauses.push('COALESCE(f3.recent_failures, 0) >= 3');
  } else if (status === 'Normal') {
    clauses.push('COALESCE(f3.recent_failures, 0) < 3');
  } else if (status && status !== 'All') {
    clauses.push('a.status = ?');
    params.push(status);
  }
  if (search) { clauses.push('(a.asset_name LIKE ? OR a.asset_type LIKE ?)'); params.push(`%${search}%`, `%${search}%`); }

  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
  const [rows] = await pool.query(
    `SELECT
        a.asset_id,
        a.asset_name,
        a.asset_type,
        a.status,
        GREATEST(COALESCE(tf.total_failures, 0), COALESCE(f3.recent_failures, 0), COALESCE(a.failure_count, 0)) AS failure_count,
        c.room_name,
        a.room_id,
        COALESCE(f3.recent_failures, 0) AS recent_failures
     FROM Assets a
     JOIN Classrooms c ON c.room_id = a.room_id
     LEFT JOIN (
       SELECT asset_id, COUNT(*) AS recent_failures
       FROM FaultReports
       WHERE reported_at >= DATE_SUB(NOW(), INTERVAL 3 MONTH)
         AND asset_id IS NOT NULL
         AND status NOT IN ('Rejected', 'Cancelled')
       GROUP BY asset_id
     ) f3 ON f3.asset_id = a.asset_id
     LEFT JOIN (
       SELECT asset_id, COUNT(*) AS total_failures
       FROM FaultReports
       WHERE asset_id IS NOT NULL
         AND status NOT IN ('Rejected', 'Cancelled')
       GROUP BY asset_id
     ) tf ON tf.asset_id = a.asset_id
     ${where}
     ORDER BY recent_failures DESC, failure_count DESC, a.asset_name`,
    params
  );
  return rows;
}

module.exports = { findAll, findById, create, update, remove, hasActiveWorkOrder, findReplacementAlerts, findAllWithFailures };
