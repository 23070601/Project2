const { pool } = require('../../config/db');

async function findByOrderId(orderId) {
  const [rows] = await pool.execute('SELECT * FROM UserConfirmations WHERE order_id = ?', [orderId]);
  return rows[0] || null;
}

async function create({ orderId, reporterId, isConfirmed, rating, feedback }) {
  const [existing] = await pool.execute('SELECT * FROM UserConfirmations WHERE order_id = ?', [orderId]);
  if (existing.length > 0) {
    await pool.execute(
      `UPDATE UserConfirmations
       SET is_confirmed = ?, rating = ?, feedback = ?, confirmed_at = CURRENT_TIMESTAMP
       WHERE order_id = ?`,
      [isConfirmed ? 1 : 0, rating ?? null, feedback ?? null, orderId]
    );
  } else {
    await pool.execute(
      `INSERT INTO UserConfirmations (order_id, reporter_id, is_confirmed, rating, feedback, confirmed_at)
       VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
      [orderId, reporterId, isConfirmed ? 1 : 0, rating ?? null, feedback ?? null]
    );
  }

  // Update WorkOrder task_status to Closed
  await pool.execute(
    `UPDATE WorkOrders SET task_status = 'Closed', closed_at = CURRENT_TIMESTAMP WHERE order_id = ?`,
    [orderId]
  );

  // Log to WorkOrderStatusHistory: system auto-close
  await pool.execute(
    `INSERT INTO WorkOrderStatusHistory (order_id, old_status, new_status, changed_by, note)
     VALUES (?, 'Completed', 'Closed', NULL, 'System auto-closed after user confirmation')`,
    [orderId]
  );

  // Update FaultReport status to Completed
  await pool.execute(
    `UPDATE FaultReports fr JOIN WorkOrders wo ON fr.report_id = wo.report_id SET fr.status = 'Completed' WHERE wo.order_id = ?`,
    [orderId]
  );

  // Fetch details to send notifications
  const [woRows] = await pool.execute(
    `SELECT manager_id, technician_id, report_id FROM WorkOrders WHERE order_id = ?`,
    [orderId]
  );
  if (woRows.length > 0) {
    const { manager_id, technician_id, report_id } = woRows[0];
    
    // Notify Manager
    if (manager_id) {
      await pool.execute(
        `INSERT INTO Notifications (user_id, report_id, order_id, message)
         VALUES (?, ?, ?, ?)`,
        [manager_id, report_id, orderId, `Work Order #${orderId} has been confirmed and closed by User.`]
      );
    }

    // Notify Technician
    if (technician_id) {
      await pool.execute(
        `INSERT INTO Notifications (user_id, report_id, order_id, message)
         VALUES (?, ?, ?, ?)`,
        [technician_id, report_id, orderId, `Work Order #${orderId} has been confirmed and closed by User.`]
      );
    }
  }

  return findByOrderId(orderId);
}

module.exports = { findByOrderId, create };
