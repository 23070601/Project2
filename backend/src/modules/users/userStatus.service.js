const { ApiError } = require('../../shared/utils/responseWrapper');
const { ROLES } = require('../../shared/constants/roles');

async function ensureUserCanBeDeactivated({ pool, user, newActive }) {
  if (newActive !== false) return;
  if (!user || user.role !== ROLES.TECHNICIAN) return;

  const [rows] = await pool.query(
    `SELECT COUNT(*) AS activeWorkOrderCount
     FROM WorkOrders wo
     WHERE wo.technician_id = ?
       AND wo.task_status NOT IN ('Completed', 'Closed')`,
    [user.user_id]
  );

  const activeWorkOrderCount = Number(rows?.[0]?.activeWorkOrderCount || 0);
  if (activeWorkOrderCount > 0) {
    throw new ApiError(409, 'Cannot deactivate technician while they still have active work orders.');
  }
}

module.exports = {
  ensureUserCanBeDeactivated,
};
