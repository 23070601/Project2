const { pool } = require('../../config/db');

async function findByOrderId(orderId) {
  const [rows] = await pool.execute('SELECT * FROM UserConfirmations WHERE order_id = ?', [orderId]);
  return rows[0] || null;
}

async function create({ orderId, reporterId, isConfirmed, rating, feedback }) {
  await pool.execute(
    `INSERT INTO UserConfirmations (order_id, reporter_id, is_confirmed, rating, feedback, confirmed_at)
     VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
    [orderId, reporterId, isConfirmed, rating ?? null, feedback ?? null]
  );

  // Update WorkOrder task_status to Closed
  await pool.execute(
    `UPDATE WorkOrders SET task_status = 'Closed', closed_at = CURRENT_TIMESTAMP WHERE order_id = ?`,
    [orderId]
  );

  // Update FaultReport status to Closed
  await pool.execute(
    `UPDATE FaultReports fr JOIN WorkOrders wo ON fr.report_id = wo.report_id SET fr.status = 'Closed' WHERE wo.order_id = ?`,
    [orderId]
  );

  return findByOrderId(orderId);
}

module.exports = { findByOrderId, create };
