const { pool } = require('../../config/db');

const BASE_SELECT = `
  SELECT wo.*,
         fr.description, fr.priority, fr.status AS report_status, fr.room_id, fr.asset_id,
         c.room_name, a.asset_name, a.asset_type,
         reporter.user_id AS reporter_id, reporter.full_name AS reporter_name,
         tech.full_name AS technician_name, tech.technician_specialty,
         mgr.full_name AS manager_name
  FROM WorkOrders wo
  JOIN FaultReports fr ON fr.report_id = wo.report_id
  JOIN Classrooms c ON c.room_id = fr.room_id
  LEFT JOIN Assets a ON a.asset_id = fr.asset_id
  JOIN Users reporter ON reporter.user_id = fr.reporter_id
  JOIN Users tech ON tech.user_id = wo.technician_id
  JOIN Users mgr ON mgr.user_id = wo.manager_id
`;

async function findAll({ technicianId, managerId, taskStatus, technicianResponse } = {}) {
  const clauses = [];
  const params = [];

  if (technicianId) { clauses.push('wo.technician_id = ?'); params.push(technicianId); }
  if (managerId) { clauses.push('wo.manager_id = ?'); params.push(managerId); }
  if (taskStatus) { clauses.push('wo.task_status = ?'); params.push(taskStatus); }
  if (technicianResponse) { clauses.push('wo.technician_response = ?'); params.push(technicianResponse); }

  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
  const [rows] = await pool.query(`${BASE_SELECT} ${where} ORDER BY wo.assigned_at DESC`, params);
  return rows;
}

async function findById(orderId) {
  const [rows] = await pool.execute(`${BASE_SELECT} WHERE wo.order_id = ?`, [orderId]);
  return rows[0] || null;
}

async function findByReportId(reportId) {
  const [rows] = await pool.execute(`${BASE_SELECT} WHERE wo.report_id = ?`, [reportId]);
  return rows[0] || null;
}

// INSERT vào WorkOrders sẽ tự kích hoạt trigger trg_workorders_after_insert
// (ghi WorkOrderStatusHistory + Notification + set FaultReports.status='Processing')
async function create({ reportId, managerId, technicianId }) {
  const [result] = await pool.execute(
    `INSERT INTO WorkOrders (report_id, manager_id, technician_id) VALUES (?, ?, ?)`,
    [reportId, managerId, technicianId]
  );
  return findById(result.insertId);
}

// UPDATE task_status/technician_response sẽ tự kích hoạt trigger trg_workorders_after_update
async function respondToAssignment(orderId, { technicianResponse, rejectionReason = null }) {
  await pool.execute(
    `UPDATE WorkOrders SET technician_response = ?, rejection_reason = ?,
       task_status = CASE WHEN ? = 'Accepted' THEN 'Received' ELSE task_status END
     WHERE order_id = ?`,
    [technicianResponse, rejectionReason, technicianResponse, orderId]
  );
  return findById(orderId);
}

async function updateTaskStatus(orderId, taskStatus) {
  const resolvedAtSql = taskStatus === 'Completed' ? ', resolved_at = CURRENT_TIMESTAMP' : '';
  const closedAtSql = taskStatus === 'Closed' ? ', closed_at = CURRENT_TIMESTAMP' : '';
  await pool.execute(
    `UPDATE WorkOrders SET task_status = ? ${resolvedAtSql} ${closedAtSql} WHERE order_id = ?`,
    [taskStatus, orderId]
  );
  return findById(orderId);
}

async function updateFixDetails(orderId, { fixDescription, partsUsed }) {
  const fields = [];
  const params = [];
  if (fixDescription !== undefined) { fields.push('fix_description = ?'); params.push(fixDescription); }
  if (partsUsed !== undefined) { fields.push('parts_used = ?'); params.push(partsUsed); }
  if (fields.length === 0) return findById(orderId);

  params.push(orderId);
  await pool.execute(`UPDATE WorkOrders SET ${fields.join(', ')} WHERE order_id = ?`, params);
  return findById(orderId);
}

async function getStatusHistory(orderId) {
  const [rows] = await pool.execute(
    'SELECT * FROM WorkOrderStatusHistory WHERE order_id = ? ORDER BY changed_at ASC',
    [orderId]
  );
  return rows;
}

module.exports = {
  findAll,
  findById,
  findByReportId,
  create,
  respondToAssignment,
  updateTaskStatus,
  updateFixDetails,
  getStatusHistory,
};
