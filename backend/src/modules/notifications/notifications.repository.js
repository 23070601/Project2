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
  return rows[0].unreadCount;
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

module.exports = { findAllForUser, countUnread, markAsRead, markAllAsRead };
