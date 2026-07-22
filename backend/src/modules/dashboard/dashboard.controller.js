const { pool } = require('../../config/db');
const { ok } = require('../../shared/utils/responseWrapper');

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
  const [[{ replacementAlerts }]] = await pool.query(
    `SELECT COUNT(*) AS replacementAlerts FROM v_dss3_replacement_alerts`
  );

  ok(res, { pendingApproval, processing, completedToday, highPriorityOpen, replacementAlerts });
}

// Managers/Report&Analytics.html - MTTR theo kỹ thuật viên/loại thiết bị (view có sẵn)
async function mttr(req, res) {
  const [rows] = await pool.query('SELECT * FROM v_dashboard_mttr');
  ok(res, rows);
}

// Managers/Report&Analytics.html - downtime theo thiết bị (view có sẵn, join thêm room_name)
async function downtime(req, res) {
  const [rows] = await pool.query(
    `SELECT d.*, c.room_name
     FROM v_dashboard_asset_downtime d
     JOIN Assets a ON a.asset_id = d.asset_id
     JOIN Classrooms c ON c.room_id = a.room_id
     ORDER BY d.downtime_hours DESC LIMIT 50`
  );
  ok(res, rows);
}

// DSS2 - tải công việc hiện tại theo từng kỹ thuật viên (view có sẵn)
async function technicianWorkload(req, res) {
  const [rows] = await pool.query('SELECT * FROM v_dss2_technician_workload');
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
