const notificationsRepository = require('./notifications.repository');
const { ok, noContent } = require('../../shared/utils/responseWrapper');
const { toPositiveInt } = require('../../shared/utils/validators');

// */Notifications.html (User, Technician, Manager đều dùng chung endpoint này)
async function list(req, res) {
  const unreadOnly = req.query.unreadOnly === 'true';
  const notifications = await notificationsRepository.findAllForUser(req.user.userId, { unreadOnly });
  ok(res, notifications);
}

// Badge số trên chuông thông báo (topbar.html)
async function unreadCount(req, res) {
  const unreadCount = await notificationsRepository.countUnread(req.user.userId);
  ok(res, { unreadCount });
}

async function markAsRead(req, res) {
  const notificationId = toPositiveInt(req.params.id, 'id');
  await notificationsRepository.markAsRead(notificationId, req.user.userId);
  noContent(res);
}

async function markAllAsRead(req, res) {
  await notificationsRepository.markAllAsRead(req.user.userId);
  noContent(res);
}

module.exports = { list, unreadCount, markAsRead, markAllAsRead };
