const { pool } = require('../../config/db');

const BASE_SELECT = `
  SELECT fr.*,
         CASE 
           WHEN wo.task_status = 'Closed' THEN 'Closed'
           WHEN wo.task_status = 'Completed' THEN 'Completed'
           WHEN wo.task_status IN ('Assigned', 'Received', 'In Progress') THEN 'Processing'
           ELSE fr.status
         END AS display_status,
         u.full_name AS reporter_name,
         u.full_name AS reporter_full_name,
         u.email AS reporter_email,
         c.room_name,
         a.asset_name, a.asset_type,
         wo.order_id, wo.task_status, wo.technician_id, t.full_name AS technician_name,
         wo.assigned_at, wo.resolved_at, wo.fix_description, wo.parts_used
  FROM FaultReports fr
  JOIN Users u ON u.user_id = fr.reporter_id
  JOIN Classrooms c ON c.room_id = fr.room_id
  LEFT JOIN Assets a ON a.asset_id = fr.asset_id
  LEFT JOIN WorkOrders wo ON wo.report_id = fr.report_id
  LEFT JOIN Users t ON t.user_id = wo.technician_id
`;

async function getImages(reportId) {
  try {
    const [rows] = await pool.execute(
      `SELECT image_path FROM ReportImages WHERE report_id = ? ORDER BY image_id ASC`,
      [reportId]
    );
    return rows.map(r => r.image_path);
  } catch (e) {
    return [];
  }
}

async function addImages(reportId, imagePaths) {
  if (!imagePaths || !imagePaths.length) return;
  try {
    const values = imagePaths.map(path => [reportId, path]);
    await pool.query(
      `INSERT INTO ReportImages (report_id, image_path) VALUES ?`,
      [values]
    );
  } catch (e) {
    console.warn('Failed to insert into ReportImages:', e.message);
  }
}

async function findAll({ status, priority, reporterId, roomId, sort } = {}) {
  const clauses = [];
  const params = [];

  if (status) {
    if (['Pending Approval', 'Pending'].includes(status)) {
      clauses.push("(fr.status IN ('Pending Approval', 'Pending') AND wo.order_id IS NULL)");
    } else if (status === 'Processing') {
      clauses.push("(fr.status = 'Processing' OR (wo.order_id IS NOT NULL AND wo.task_status IN ('Assigned', 'Received', 'In Progress')))");
    } else if (status === 'Completed') {
      clauses.push("(fr.status = 'Completed' OR wo.task_status IN ('Completed', 'Closed'))");
    } else {
      clauses.push('fr.status = ?');
      params.push(status);
    }
  }
  if (priority) { clauses.push('fr.priority = ?'); params.push(priority); }
  if (reporterId) { clauses.push('fr.reporter_id = ?'); params.push(reporterId); }
  if (roomId) { clauses.push('fr.room_id = ?'); params.push(roomId); }

  const orderSql = sort === 'oldest' ? 'ORDER BY fr.reported_at ASC' : 'ORDER BY fr.reported_at DESC';
  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
  const [rows] = await pool.query(
    `${BASE_SELECT} ${where} ${orderSql}`,
    params
  );

  const reportIds = rows.map(r => r.report_id);
  if (reportIds.length > 0) {
    try {
      const [imgRows] = await pool.query(
        `SELECT report_id, image_path FROM ReportImages WHERE report_id IN (?) ORDER BY image_id ASC`,
        [reportIds]
      );
      const imgMap = {};
      imgRows.forEach(r => {
        if (!imgMap[r.report_id]) imgMap[r.report_id] = [];
        imgMap[r.report_id].push(r.image_path);
      });
      rows.forEach(r => {
        if (imgMap[r.report_id] && imgMap[r.report_id].length > 0) {
          r.images = imgMap[r.report_id];
        } else if (r.image_path) {
          r.images = [r.image_path];
        } else {
          r.images = [];
        }
      });
    } catch (e) {
      rows.forEach(r => {
        r.images = r.image_path ? [r.image_path] : [];
      });
    }
  }

  return rows;
}

async function findById(reportId) {
  const [rows] = await pool.execute(`${BASE_SELECT} WHERE fr.report_id = ?`, [reportId]);
  if (!rows[0]) return null;
  const report = rows[0];
  const images = await getImages(reportId);
  if (images.length > 0) {
    report.images = images;
  } else if (report.image_path) {
    report.images = [report.image_path];
  } else {
    report.images = [];
  }
  if (report.order_id) {
    try {
      const [shRows] = await pool.execute(
        `SELECT history_id, order_id, old_status, new_status, changed_by, note AS note, changed_at
         FROM WorkOrderStatusHistory
         WHERE order_id = ?
         ORDER BY changed_at ASC`,
        [report.order_id]
      );
      report.statusHistory = shRows;
    } catch (e) {
      report.statusHistory = [];
    }
  }
  return report;
}

async function create({ reporterId, assetId, roomId, description, imagePath, priority, images }) {
  const primaryImagePath = imagePath || (images && images.length > 0 ? images[0] : null);
  const [result] = await pool.execute(
    `INSERT INTO FaultReports (reporter_id, asset_id, room_id, description, image_path, priority)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [reporterId, assetId, roomId, description, primaryImagePath, priority]
  );
  const reportId = result.insertId;
  if (images && images.length > 0) {
    await addImages(reportId, images);
  }
  return findById(reportId);
}

async function updateStatus(reportId, status, rejectionReason = null) {
  if (status === 'Rejected') {
    try {
      await pool.execute(
        `UPDATE FaultReports SET status = ?, rejection_reason = ?, rejected_at = NOW() WHERE report_id = ?`,
        [status, rejectionReason, reportId]
      );
    } catch (e) {
      // Fallback if column doesn't exist yet
      await pool.execute('UPDATE FaultReports SET status = ? WHERE report_id = ?', [status, reportId]);
    }
  } else {
    await pool.execute('UPDATE FaultReports SET status = ? WHERE report_id = ?', [status, reportId]);
  }
  return findById(reportId);
}

async function getStatusHistory(reportId) {
  const [rows] = await pool.execute(
    `SELECT h.* FROM WorkOrderStatusHistory h
     JOIN WorkOrders wo ON wo.order_id = h.order_id
     WHERE wo.report_id = ?
     ORDER BY h.changed_at ASC`,
    [reportId]
  );
  return rows;
}

async function remove(reportId) {
  await pool.execute('DELETE FROM FaultReports WHERE report_id = ?', [reportId]);
}

async function ensureFaultReportsColumns() {
  try {
    const [cols] = await pool.query("SHOW COLUMNS FROM FaultReports LIKE 'rejection_reason'");
    if (!cols || cols.length === 0) {
      await pool.query("ALTER TABLE FaultReports ADD COLUMN rejection_reason VARCHAR(255) NULL");
    }
    const [cols2] = await pool.query("SHOW COLUMNS FROM FaultReports LIKE 'rejected_at'");
    if (!cols2 || cols2.length === 0) {
      await pool.query("ALTER TABLE FaultReports ADD COLUMN rejected_at TIMESTAMP NULL");
    }
  } catch (e) {
    console.warn('[DB] Could not ensure FaultReports columns:', e.message);
  }
}

module.exports = { findAll, findById, create, updateStatus, getStatusHistory, remove, addImages, getImages, ensureFaultReportsColumns };


