const { pool } = require('../../config/db');
const { ok } = require('../../shared/utils/responseWrapper');

async function queryWithFallback(primarySql, fallbackSql) {
  try {
    const [rows] = await pool.query(primarySql);
    return rows;
  } catch (err) {
    const [rows] = await pool.query(fallbackSql);
    return rows;
  }
}

// Managers/ManagerDashboard.html - 5-card KPI grid
async function kpis(req, res) {
  const [[{ pendingApproval }]] = await pool.query(
    `SELECT COUNT(*) AS pendingApproval FROM FaultReports WHERE status = 'Pending Approval'`
  );
  const [[{ processing }]] = await pool.query(
    `SELECT COUNT(*) AS processing FROM FaultReports WHERE status = 'Processing'`
  );
  const [[{ completedToday }]] = await pool.query(
    `SELECT COUNT(*) AS completedToday FROM WorkOrders
     WHERE task_status IN ('Completed','Closed') AND DATE(resolved_at) = CURDATE()`
  );
  const [[{ highPriorityOpen }]] = await pool.query(
    `SELECT COUNT(*) AS highPriorityOpen FROM FaultReports
     WHERE priority = 'High' AND status IN ('Pending Approval','Processing')`
  );
  let replacementAlerts = 0;
  try {
    const [[row]] = await pool.query('SELECT COUNT(*) AS replacementAlerts FROM v_dss3_replacement_alerts');
    replacementAlerts = row.replacementAlerts;
  } catch (err) {
    const [[row]] = await pool.query(
      `SELECT COUNT(*) AS replacementAlerts
       FROM Assets a
       JOIN Classrooms c ON c.room_id = a.room_id
       WHERE a.failure_count >= 3 AND a.status <> 'Retired'`
    );
    replacementAlerts = row.replacementAlerts;
  }

  ok(res, { pendingApproval, processing, completedToday, highPriorityOpen, replacementAlerts });
}

// Managers/Report&Analytics.html - MTTR theo kỹ thuật viên/loại thiết bị (view có sẵn)
async function mttr(req, res) {
  const rows = await queryWithFallback(
    'SELECT * FROM v_dashboard_mttr',
    `SELECT wo.technician_id, u.full_name AS technician_name, a.asset_type,
            COUNT(wo.order_id) AS completed_orders,
            AVG(TIMESTAMPDIFF(MINUTE, wo.assigned_at, wo.resolved_at)) AS avg_repair_minutes
     FROM WorkOrders wo
     JOIN Users u ON u.user_id = wo.technician_id
     JOIN FaultReports fr ON fr.report_id = wo.report_id
     LEFT JOIN Assets a ON a.asset_id = fr.asset_id
     WHERE wo.resolved_at IS NOT NULL
     GROUP BY wo.technician_id, u.full_name, a.asset_type`
  );
  ok(res, rows);
}

// Managers/Report&Analytics.html - downtime theo thiết bị (view có sẵn, join thêm room_name)
async function downtime(req, res) {
  const rows = await queryWithFallback(
    `SELECT d.*, c.room_name
     FROM v_dashboard_asset_downtime d
     JOIN Assets a ON a.asset_id = d.asset_id
     JOIN Classrooms c ON c.room_id = a.room_id
     ORDER BY d.downtime_hours DESC LIMIT 50`,
    `SELECT a.asset_id, a.asset_name, fr.report_id, fr.reported_at, wo.resolved_at,
            TIMESTAMPDIFF(HOUR, fr.reported_at, wo.resolved_at) AS downtime_hours,
            c.room_name
     FROM FaultReports fr
     JOIN Assets a ON a.asset_id = fr.asset_id
     JOIN Classrooms c ON c.room_id = a.room_id
     LEFT JOIN WorkOrders wo ON wo.report_id = fr.report_id
     WHERE wo.resolved_at IS NOT NULL
     ORDER BY downtime_hours DESC LIMIT 50`
  );
  ok(res, rows);
}

// DSS2 - tải công việc hiện tại theo từng kỹ thuật viên (view có sẵn)
async function technicianWorkload(req, res) {
  const rows = await queryWithFallback(
    'SELECT * FROM v_dss2_technician_workload',
    `SELECT u.user_id AS technician_id,
            u.full_name,
            u.technician_specialty,
            COUNT(CASE WHEN wo.task_status IN ('Assigned', 'Received', 'In Progress') THEN 1 END) AS active_workload,
            COUNT(wo.order_id) AS total_assigned
     FROM Users u
     LEFT JOIN WorkOrders wo ON wo.technician_id = u.user_id
     WHERE u.role = 'Technician'
     GROUP BY u.user_id, u.full_name, u.technician_specialty
     ORDER BY active_workload ASC`
  );
  ok(res, rows);
}

// Managers/Report&Analytics.html - xu hướng báo cáo lỗi theo ngày (30 ngày gần nhất)
async function reportTrend(req, res) {
  const [rows] = await pool.query(
    `SELECT DATE(reported_at) AS date, priority, COUNT(*) AS total
     FROM FaultReports
     WHERE reported_at >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
     GROUP BY DATE(reported_at), priority
     ORDER BY date ASC`
  );
  ok(res, rows);
}

module.exports = { kpis, mttr, downtime, technicianWorkload, reportTrend };
