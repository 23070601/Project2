const { ApiError } = require('../../shared/utils/responseWrapper');
const { ROLES } = require('../../shared/constants/roles');

async function ensureUserCanBeDeactivated({ pool, user, newActive }) {
  if (newActive !== false) return;
  if (!user) return;

  const [rows] = await pool.query(
    `SELECT
       (SELECT COUNT(*)
        FROM WorkOrders wo
        WHERE wo.technician_id = ?
          AND wo.task_status NOT IN ('Completed', 'Closed')) AS technicianActiveWorkOrderCount,
       (SELECT COUNT(*)
        FROM WorkOrders wo
        WHERE wo.manager_id = ?
          AND wo.task_status NOT IN ('Completed', 'Closed')) AS managerActiveWorkOrderCount`,
    [user.user_id, user.user_id]
  );

  const activeWorkOrderCount = Number(rows?.[0]?.technicianActiveWorkOrderCount || 0) + Number(rows?.[0]?.managerActiveWorkOrderCount || 0);
  if (activeWorkOrderCount > 0) {
    throw new ApiError(409, 'Cannot deactivate user while they still have active work orders.');
  }
}

module.exports = {
  ensureUserCanBeDeactivated,
};
