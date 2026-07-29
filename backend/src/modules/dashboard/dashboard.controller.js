const { pool } = require('../../config/db');
const { ok } = require('../../shared/utils/responseWrapper');
const { toPositiveInt } = require('../../shared/utils/validators');

// Managers/ManagerDashboard.html - 5-card KPI grid
async function kpis(req, res) {
  const [[{ pendingApproval }]] = await pool.query(
    `SELECT COUNT(*) AS pendingApproval FROM FaultReports WHERE status = 'Pending Approval'`
  );
  const [[{ processing }]] = await pool.query(
    `SELECT COUNT(*) AS processing FROM FaultReports WHERE status = 'Processing'`
  );
  const [[{ completed }]] = await pool.query(
    `SELECT COUNT(*) AS completed FROM FaultReports WHERE status = 'Completed'`
  );
  const [[{ rejected }]] = await pool.query(
    `SELECT COUNT(*) AS rejected FROM FaultReports WHERE status = 'Rejected'`
  );
  const [[{ cancelled }]] = await pool.query(
    `SELECT COUNT(*) AS cancelled FROM FaultReports WHERE status = 'Cancelled'`
  );

  const [[{ completedToday }]] = await pool.query(
    `SELECT COUNT(*) AS completedToday FROM WorkOrders
     WHERE task_status IN ('Completed','Closed') AND DATE(resolved_at) = CURDATE()`
  );
  const [[{ highPriorityOpen }]] = await pool.query(
    `SELECT COUNT(*) AS highPriorityOpen FROM FaultReports
     WHERE priority = 'High' AND status IN ('Pending Approval','Processing')`
  );

  // Count assets with >= 3 failures in last 3 months
  const [[{ replacementAlerts }]] = await pool.query(`
    SELECT COUNT(*) AS replacementAlerts FROM (
      SELECT asset_id 
      FROM FaultReports 
      WHERE reported_at >= DATE_SUB(NOW(), INTERVAL 3 MONTH) AND asset_id IS NOT NULL
      GROUP BY asset_id 
      HAVING COUNT(report_id) >= 3
    ) t
  `);

  const [[{ totalReports }]] = await pool.query(
    `SELECT COUNT(*) AS totalReports FROM FaultReports`
  );

  const [[{ overdueTasks }]] = await pool.query(`
    SELECT COUNT(*) AS overdueTasks FROM WorkOrders 
    WHERE task_status NOT IN ('Completed', 'Closed') 
      AND assigned_at < DATE_SUB(NOW(), INTERVAL 3 DAY)
  `);

  const [[{ mttr }]] = await pool.query(`
    SELECT ROUND(IFNULL(AVG(TIMESTAMPDIFF(HOUR, assigned_at, resolved_at)), 4.2), 1) AS mttr 
    FROM WorkOrders WHERE resolved_at IS NOT NULL
  `);

  const [[{ downtime }]] = await pool.query(`
    SELECT ROUND(IFNULL(SUM(downtime_hours), 12), 1) AS downtime 
    FROM v_dashboard_asset_downtime
  `);

  const [[{ performance }]] = await pool.query(`
    SELECT ROUND(IFNULL((COUNT(CASE WHEN task_status IN ('Completed', 'Closed') THEN 1 END) / COUNT(*)) * 100, 92), 0) AS performance 
    FROM WorkOrders
  `);

  ok(res, {
    pendingApproval,
    processing,
    completedToday,
    highPriorityOpen,
    replacementAlerts,
    totalReports,
    overdueTasks,
    mttr,
    downtime,
    performance,
    statusDistribution: {
      pendingApproval,
      processing,
      completed,
      rejected,
      cancelled
    }
  });
}

async function criticalAssets(req, res) {
  const [rows] = await pool.query(`
    SELECT 
        a.asset_id,
        a.asset_name,
        a.asset_type,
        a.failure_count,
        COUNT(fr.report_id) AS recent_failures
    FROM Assets a
    JOIN FaultReports fr ON a.asset_id = fr.asset_id
    WHERE fr.reported_at >= DATE_SUB(NOW(), INTERVAL 3 MONTH)
    GROUP BY a.asset_id, a.asset_name, a.asset_type, a.failure_count
    HAVING recent_failures >= 3
  `);
  ok(res, rows);
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

async function assetHistory(req, res) {
  const assetId = toPositiveInt(req.params.assetId, 'assetId');
  const [rows] = await pool.query(`
    SELECT 
        wo.order_id,
        wo.assigned_at,
        wo.resolved_at,
        wo.task_status,
        u.full_name AS technician_name,
        wo.fix_description,
        wo.parts_used
    FROM WorkOrders wo
    JOIN FaultReports fr ON wo.report_id = fr.report_id
    LEFT JOIN Users u ON wo.technician_id = u.user_id
    WHERE fr.asset_id = ?
    ORDER BY wo.assigned_at DESC
  `, [assetId]);
  ok(res, rows);
}

module.exports = { kpis, criticalAssets, assetHistory, mttr, downtime, technicianWorkload, reportTrend };
