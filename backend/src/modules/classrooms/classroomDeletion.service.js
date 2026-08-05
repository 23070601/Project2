const { ApiError } = require('../../shared/utils/responseWrapper');

async function ensureRoomCanBeDeleted({ pool, roomId }) {
  if (!roomId) return;

  const [rows] = await pool.query(
    `SELECT
       (SELECT COUNT(*) FROM Assets a WHERE a.room_id = ? AND a.status NOT IN ('Retired')) AS activeAssetCount,
       (SELECT COUNT(*) FROM FaultReports fr WHERE fr.room_id = ?) AS maintenanceHistoryCount`,
    [roomId, roomId]
  );

  const activeAssetCount = Number(rows?.[0]?.activeAssetCount || 0);
  const maintenanceHistoryCount = Number(rows?.[0]?.maintenanceHistoryCount || 0);

  if (activeAssetCount > 0) {
    throw new ApiError(409, 'Cannot delete room while it still has active assets.');
  }

  if (maintenanceHistoryCount > 0) {
    throw new ApiError(409, 'Cannot delete room while it still has maintenance history.');
  }
}

module.exports = {
  ensureRoomCanBeDeleted,
};
