const { pool } = require('../../config/db');

async function findAllForUser(userId, { unreadOnly = false, limit = 50 } = {}) {
  const clauses = ['user_id = ?'];
  const params = [userId];
  if (unreadOnly) clauses.push('is_read = FALSE');

  const [rows] = await pool.query(
    `SELECT * FROM Notifications WHERE ${clauses.join(' AND ')} ORDER BY created_at DESC LIMIT ?`,
    [...params, Number(limit)]
  );
  return rows;
}

async function countUnread(userId) {
  const [rows] = await pool.execute(
    'SELECT COUNT(*) AS unreadCount FROM Notifications WHERE user_id = ? AND is_read = FALSE',
    [userId]
  );
  return Number(rows[0]?.unreadCount || 0);
}

async function markAsRead(notificationId, userId) {
  await pool.execute(
    'UPDATE Notifications SET is_read = TRUE WHERE notification_id = ? AND user_id = ?',
    [notificationId, userId]
  );
}

async function markAllAsRead(userId) {
  await pool.execute('UPDATE Notifications SET is_read = TRUE WHERE user_id = ?', [userId]);
}

async function createNotification({ userId, reportId = null, orderId = null, message }) {
  if (!userId || !message) return null;
  const [result] = await pool.execute(
    'INSERT INTO Notifications (user_id, report_id, order_id, message) VALUES (?, ?, ?, ?)',
    [userId, reportId, orderId, message]
  );
  return result.insertId;
}

async function notifyRole(role, { reportId = null, orderId = null, message }) {
  const [users] = await pool.execute('SELECT user_id FROM Users WHERE role = ? AND is_active = TRUE', [role]);
  const createdIds = [];
  for (const u of users) {
    const id = await createNotification({ userId: u.user_id, reportId, orderId, message });
    if (id) createdIds.push(id);
  }
  return createdIds;
}

async function create(data) {
  const { userId, reportId = null, orderId = null, message } = data || {};
  return createNotification({ userId, reportId, orderId, message });
}

module.exports = {
  findAllForUser,
  countUnread,
  markAsRead,
  markAllAsRead,
  createNotification,
  create,
  notifyRole,
};
