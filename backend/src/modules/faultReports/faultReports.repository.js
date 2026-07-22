const { pool } = require('../../config/db');

const BASE_SELECT = `
  SELECT fr.*,
         u.full_name AS reporter_name,
         c.room_name,
         a.asset_name, a.asset_type,
         wo.order_id, wo.task_status, wo.technician_id, t.full_name AS technician_name
  FROM FaultReports fr
  JOIN Users u ON u.user_id = fr.reporter_id
  JOIN Classrooms c ON c.room_id = fr.room_id
  LEFT JOIN Assets a ON a.asset_id = fr.asset_id
  LEFT JOIN WorkOrders wo ON wo.report_id = fr.report_id
  LEFT JOIN Users t ON t.user_id = wo.technician_id
`;

async function findAll({ status, priority, reporterId, roomId } = {}) {
  const clauses = [];
  const params = [];

  if (status) { clauses.push('fr.status = ?'); params.push(status); }
  if (priority) { clauses.push('fr.priority = ?'); params.push(priority); }
  if (reporterId) { clauses.push('fr.reporter_id = ?'); params.push(reporterId); }
  if (roomId) { clauses.push('fr.room_id = ?'); params.push(roomId); }

  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
  const [rows] = await pool.query(
    `${BASE_SELECT} ${where} ORDER BY fr.reported_at DESC`,
    params
  );
  return rows;
}

async function findById(reportId) {
  const [rows] = await pool.execute(`${BASE_SELECT} WHERE fr.report_id = ?`, [reportId]);
  return rows[0] || null;
}

async function create({ reporterId, assetId, roomId, description, imagePath, priority }) {
  const [result] = await pool.execute(
    `INSERT INTO FaultReports (reporter_id, asset_id, room_id, description, image_path, priority)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [reporterId, assetId, roomId, description, imagePath, priority]
  );
  return findById(result.insertId);
}

async function updateStatus(reportId, status) {
  await pool.execute('UPDATE FaultReports SET status = ? WHERE report_id = ?', [status, reportId]);
  return findById(reportId);
}

async function getStatusHistory(reportId) {
  const [rows] = await pool.execute(
    `SELECT h.* FROM WorkOrderStatusHistory h
     JOIN WorkOrders wo ON wo.order_id = h.order_id
     WHERE wo.report_id = ?
     ORDER BY h.changed_at ASC`,
    [reportId]
  );
  return rows;
}

module.exports = { findAll, findById, create, updateStatus, getStatusHistory };
