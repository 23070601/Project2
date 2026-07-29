const { pool } = require('../../config/db');

function buildDateRangeCondition(filter, startDate, endDate) {
  let condition = '';
  const params = [];

  if (filter === 'Today') {
    condition = 'AND DATE(fr.reported_at) = CURDATE()';
  } else if (filter === 'This Week') {
    condition = 'AND YEARWEEK(fr.reported_at, 1) = YEARWEEK(CURDATE(), 1)';
  } else if (filter === 'This Month') {
    condition = 'AND YEAR(fr.reported_at) = YEAR(CURDATE()) AND MONTH(fr.reported_at) = MONTH(CURDATE())';
  } else if (filter === 'This Year') {
    condition = 'AND YEAR(fr.reported_at) = YEAR(CURDATE())';
  } else if (filter === 'Custom Range' && startDate && endDate) {
    condition = 'AND DATE(fr.reported_at) BETWEEN ? AND ?';
    params.push(startDate, endDate);
  }

  return { condition, params };
}

async function getOverviewStats({ filter, startDate, endDate } = {}) {
  const [[{ totalAssets }]] = await pool.query('SELECT COUNT(*) AS totalAssets FROM Assets');

  const { condition, params } = buildDateRangeCondition(filter, startDate, endDate);

  const [[{ maintenanceRequests }]] = await pool.query(
    `SELECT COUNT(*) AS maintenanceRequests 
     FROM FaultReports fr 
     WHERE fr.status NOT IN ('Rejected', 'Cancelled') ${condition}`,
    params
  );

  let woCondition = '';
  const woParams = [];
  if (filter === 'Today') {
    woCondition = 'AND DATE(wo.assigned_at) = CURDATE()';
  } else if (filter === 'This Week') {
    woCondition = 'AND YEARWEEK(wo.assigned_at, 1) = YEARWEEK(CURDATE(), 1)';
  } else if (filter === 'This Month') {
    woCondition = 'AND YEAR(wo.assigned_at) = YEAR(CURDATE()) AND MONTH(wo.assigned_at) = MONTH(CURDATE())';
  } else if (filter === 'This Year') {
    woCondition = 'AND YEAR(wo.assigned_at) = YEAR(CURDATE())';
  } else if (filter === 'Custom Range' && startDate && endDate) {
    woCondition = 'AND DATE(wo.assigned_at) BETWEEN ? AND ?';
    woParams.push(startDate, endDate);
  }

  const [[{ completedRepairs }]] = await pool.query(
    `SELECT COUNT(*) AS completedRepairs 
     FROM WorkOrders wo 
     WHERE wo.task_status IN ('Closed', 'Completed') ${woCondition}`,
    woParams
  );

  const reqCount = Number(maintenanceRequests || 0);
  const compCount = Number(completedRepairs || 0);
  const failureRate = reqCount > 0 ? Number(((compCount / reqCount) * 100).toFixed(1)) : 0;

  return {
    totalAssets: Number(totalAssets || 0),
    maintenanceRequests: reqCount,
    completedRepairs: compCount,
    failureRate: `${failureRate}%`,
  };
}

async function getMaintenanceOverview({ year = new Date().getFullYear(), filter, startDate, endDate } = {}) {
  let dateClause = 'AND YEAR(reported_at) = ?';
  let params = [Number(year)];

  if (filter === 'Today') {
    dateClause = 'AND DATE(reported_at) = CURDATE()';
    params = [];
  } else if (filter === 'This Week') {
    dateClause = 'AND YEARWEEK(reported_at, 1) = YEARWEEK(CURDATE(), 1)';
    params = [];
  } else if (filter === 'This Month') {
    dateClause = 'AND YEAR(reported_at) = YEAR(CURDATE()) AND MONTH(reported_at) = MONTH(CURDATE())';
    params = [];
  } else if (filter === 'Custom Range' && startDate && endDate) {
    dateClause = 'AND DATE(reported_at) BETWEEN ? AND ?';
    params = [startDate, endDate];
  }

  const [rows] = await pool.query(
    `SELECT 
        DATE_FORMAT(reported_at, '%b') AS month,
        MONTH(reported_at) AS month_num,
        COUNT(*) AS count
     FROM FaultReports
     WHERE status NOT IN ('Rejected', 'Cancelled') ${dateClause}
     GROUP BY DATE_FORMAT(reported_at, '%b'), MONTH(reported_at)
     ORDER BY month_num ASC`,
    params
  );

  const monthsMap = {};
  rows.forEach((r) => {
    monthsMap[r.month_num] = r.count;
  });

  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return monthNames.map((name, index) => {
    const monthNum = index + 1;
    return {
      month: name,
      count: monthsMap[monthNum] || 0,
    };
  });
}

async function getAssetFailureAnalysis({ filter, startDate, endDate } = {}) {
  const { condition, params } = buildDateRangeCondition(filter, startDate, endDate);

  const [rows] = await pool.query(
    `SELECT 
        a.asset_type,
        COUNT(fr.report_id) AS failure_count
     FROM Assets a
     JOIN FaultReports fr ON a.asset_id = fr.asset_id
     WHERE fr.status NOT IN ('Rejected', 'Cancelled') ${condition}
     GROUP BY a.asset_type
     ORDER BY failure_count DESC
     LIMIT 5`,
    params
  );

  return rows;
}

module.exports = {
  getOverviewStats,
  getMaintenanceOverview,
  getAssetFailureAnalysis,
};
