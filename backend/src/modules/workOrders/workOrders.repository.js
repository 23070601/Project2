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
  const order = rows[0] || null;
  if (order && order.asset_id) {
    try {
      const [historyRows] = await pool.execute(
        `SELECT wo.*, tech.full_name AS technician_name, mgr.full_name AS manager_name, fr.description AS reported_issue, fr.report_id, reporter.full_name AS reporter_name
         FROM WorkOrders wo
         JOIN Users tech ON tech.user_id = wo.technician_id
         LEFT JOIN Users mgr ON mgr.user_id = wo.manager_id
         JOIN FaultReports fr ON fr.report_id = wo.report_id
         LEFT JOIN Users reporter ON reporter.user_id = fr.reporter_id
         WHERE fr.asset_id = ? AND wo.task_status IN ('Completed', 'Closed') AND wo.order_id != ?
         ORDER BY wo.assigned_at DESC LIMIT 5`,
        [order.asset_id, orderId]
      );
      order.repairHistory = historyRows;

      const [failureRows] = await pool.execute(
        `SELECT COUNT(*) AS count FROM FaultReports WHERE asset_id = ?`,
        [order.asset_id]
      );
      order.failure_count = failureRows[0]?.count || 1;
    } catch (e) {
      console.log('Error fetching asset history details', e);
    }
  }
  return order;
}

async function findByReportId(reportId) {
  const [rows] = await pool.execute(`${BASE_SELECT} WHERE wo.report_id = ?`, [reportId]);
  return rows[0] || null;
}

// INSERT vào WorkOrders sẽ tự kích hoạt trigger trg_workorders_after_insert
// (ghi WorkOrderStatusHistory + Notification + set FaultReports.status='Processing')
async function create({ reportId, managerId, technicianId, deadlineAt = null }) {
  const [result] = await pool.execute(
    `INSERT INTO WorkOrders (report_id, manager_id, technician_id, deadline_at) VALUES (?, ?, ?, ?)`,
    [reportId, managerId, technicianId, deadlineAt]
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

async function updateDeadline(orderId, deadlineAt) {
  await pool.execute('UPDATE WorkOrders SET deadline_at = ? WHERE order_id = ?', [deadlineAt, orderId]);
  return findById(orderId);
}

async function getStatusHistory(orderId) {
  const [rows] = await pool.execute(
    'SELECT * FROM WorkOrderStatusHistory WHERE order_id = ? ORDER BY changed_at ASC',
    [orderId]
  );
  return rows;
}

async function reassign(orderId, technicianId) {
  await pool.execute(
    `UPDATE WorkOrders SET technician_id = ?, technician_response = 'Pending', task_status = 'Assigned', rejection_reason = NULL WHERE order_id = ?`,
    [technicianId, orderId]
  );
  await pool.execute(
    `INSERT INTO WorkOrderStatusHistory (order_id, old_status, new_status, note)
     VALUES (?, NULL, 'Assigned', 'WorkOrder reassigned to new technician')`,
    [orderId]
  );
  return findById(orderId);
}

async function rejectAssignment(orderId, rejectionReason) {
  await pool.execute(
    `UPDATE WorkOrders 
     SET technician_response = 'Rejected', 
         rejection_reason = ?, 
         task_status = 'Assigned' 
     WHERE order_id = ?`,
    [rejectionReason, orderId]
  );
  
  await pool.execute(
    `INSERT INTO WorkOrderStatusHistory (order_id, old_status, new_status, note)
     VALUES (?, 'Assigned', 'Assigned', ?)`,
    [orderId, `Technician rejected the WorkOrder.`]
  );

  return findById(orderId);
}

module.exports = {
  findAll,
  findById,
  findByReportId,
  create,
  respondToAssignment,
  updateTaskStatus,
  updateFixDetails,
  updateDeadline,
  getStatusHistory,
  reassign,
  rejectAssignment,
};
