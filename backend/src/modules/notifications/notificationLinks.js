const env = require('../../config/env');

const base = (env.frontendBaseUrl || 'http://127.0.0.1:5500').replace(/\/$/, '');

module.exports = {
  userReports: `${base}/frontend/users/ListReports.html`,
  userNotifications: `${base}/frontend/users/Notifications.html`,
  managerPending: `${base}/frontend/managers/PendingRequest.html`,
  technicianTasks: `${base}/frontend/technicians/AssignedTasks.html`,
};
