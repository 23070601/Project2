const { pool } = require('../../config/db');
const { sendEmail } = require('./email.service');
const links = require('./notificationLinks');
const { ROLES } = require('../../shared/constants/roles');

function buildOverdueReportAlert({ reportId, hours = 48, roomName = 'Unknown room', assetName = 'Unknown asset' }) {
  return {
    title: 'Overdue Fault Report Alert',
    message: `Fault report #${reportId} is still unresolved after ${hours} hours. Room: ${roomName}. Asset: ${assetName}.`,
    actionUrl: links.managerPending,
  };
}

function buildOverdueWorkOrderAlert({ orderId, hours = 48, roomName = 'Unknown room', assetName = 'Unknown asset' }) {
  return {
    title: 'Overdue Work Order Alert',
    message: `Work order #${orderId} has been pending for over ${hours} hours. Room: ${roomName}. Asset: ${assetName}.`,
    actionUrl: links.technicianTasks,
  };
}

function collectAlertRecipients({ reporterEmail, technicianEmail, managerEmails = [] }) {
  const recipients = [reporterEmail, technicianEmail, ...managerEmails].filter(Boolean);
  const seen = new Set();

  return recipients.filter((recipient) => {
    const normalized = String(recipient).trim().toLowerCase();
    if (!normalized || seen.has(normalized)) return false;
    seen.add(normalized);
    return true;
  });
}

function buildAlertDeliveryKey({ type, entityId, recipient }) {
  const normalizedRecipient = String(recipient || '').trim().toLowerCase();
  return `${type}:${entityId}:${normalizedRecipient}`;
}

function isOlderThanHours(value, hours) {
  if (!value) return false;

  const dateValue = new Date(value);
  if (Number.isNaN(dateValue.getTime())) return false;

  const thresholdMs = Number(hours) * 60 * 60 * 1000;
  return Date.now() - dateValue.getTime() >= thresholdMs;
}

function filterUnsentRecipients(recipients, { type, entityId, sentKeys, previouslyDeliveredKeys = [] }) {
  const normalizedSentKeys = sentKeys || new Set();
  const previouslyDelivered = new Set((previouslyDeliveredKeys || []).map((key) => String(key || '').trim().toLowerCase()));

  return (recipients || []).filter((recipient) => {
    const key = buildAlertDeliveryKey({ type, entityId, recipient });
    const normalizedKey = String(key || '').trim().toLowerCase();
    if (normalizedSentKeys.has(normalizedKey) || previouslyDelivered.has(normalizedKey)) return false;
    normalizedSentKeys.add(normalizedKey);
    return true;
  });
}

async function getManagerEmails() {
  const [managerRows] = await pool.query(
    `SELECT email
     FROM Users
     WHERE is_active = TRUE
       AND email IS NOT NULL
       AND TRIM(email) <> ''
       AND LOWER(role) = 'manager'
     ORDER BY email`
  );

  return (managerRows || []).map((row) => row.email).filter(Boolean);
}

async function getPreviouslyDeliveredAlertKeys() {
  const [rows] = await pool.query(
    `SELECT alert_type, entity_id, recipient
     FROM OverdueAlertDelivery
     ORDER BY created_at DESC`
  );

  return (rows || []).map((row) => buildAlertDeliveryKey({
    type: row.alert_type,
    entityId: row.entity_id,
    recipient: row.recipient,
  }));
}

async function markAlertDelivered({ type, entityId, recipient }) {
  if (!recipient) return;

  await pool.execute(
    `INSERT INTO OverdueAlertDelivery (alert_type, entity_id, recipient, created_at)
     VALUES (?, ?, ?, NOW())
     ON DUPLICATE KEY UPDATE created_at = created_at`,
    [type, entityId, String(recipient).trim().toLowerCase()]
  );
}

async function sendOverdueAlerts({ hours = 48, maxItems = 50 } = {}) {
  const thresholdHours = Number(hours);
  const [reportRowsRaw] = await pool.query(
    `SELECT fr.report_id, fr.status, fr.reported_at, fr.priority,
            r.room_name, a.asset_name,
            reporter.user_id AS reporter_id, reporter.email AS reporter_email
     FROM FaultReports fr
     LEFT JOIN Classrooms r ON r.room_id = fr.room_id
     LEFT JOIN Assets a ON a.asset_id = fr.asset_id
     LEFT JOIN Users reporter ON reporter.user_id = fr.reporter_id
     WHERE fr.status NOT IN ('Completed', 'Rejected', 'Cancelled')
     ORDER BY fr.reported_at ASC
     LIMIT ?`,
    [Number(maxItems)]
  );

  const [workOrderRowsRaw] = await pool.query(
    `SELECT wo.order_id, wo.assigned_at, wo.task_status, wo.technician_response,
            fr.report_id, r.room_name, a.asset_name,
            technician.user_id AS technician_id, technician.email AS technician_email,
            reporter.email AS reporter_email
     FROM WorkOrders wo
     JOIN FaultReports fr ON fr.report_id = wo.report_id
     LEFT JOIN Classrooms r ON r.room_id = fr.room_id
     LEFT JOIN Assets a ON a.asset_id = fr.asset_id
     LEFT JOIN Users technician ON technician.user_id = wo.technician_id
     LEFT JOIN Users reporter ON reporter.user_id = fr.reporter_id
     WHERE wo.task_status NOT IN ('Completed', 'Closed')
     ORDER BY wo.assigned_at ASC
     LIMIT ?`,
    [Number(maxItems)]
  );

  const reportRows = (reportRowsRaw || []).filter((report) => isOlderThanHours(report.reported_at, thresholdHours));
  const workOrderRows = (workOrderRowsRaw || []).filter((workOrder) => isOlderThanHours(workOrder.assigned_at, thresholdHours));
  const sent = [];
  const managerEmails = await getManagerEmails();
  const sentKeys = new Set();
  const previouslyDeliveredKeys = await getPreviouslyDeliveredAlertKeys();

  for (const report of reportRows) {
    const alert = buildOverdueReportAlert({
      reportId: report.report_id,
      hours: thresholdHours,
      roomName: report.room_name || 'Unknown room',
      assetName: report.asset_name || 'Unknown asset',
    });

    const recipients = collectAlertRecipients({
      reporterEmail: report.reporter_email,
      managerEmails,
    });
    const unsentRecipients = filterUnsentRecipients(recipients, {
      type: 'report',
      entityId: report.report_id,
      sentKeys,
      previouslyDeliveredKeys,
    });

    for (const recipient of unsentRecipients) {
      await sendEmail({
        to: recipient,
        subject: alert.title,
        title: alert.title,
        message: `${alert.message} This alert is intended for the reporter and manager roles.`,
        actionUrl: alert.actionUrl,
      });
      await markAlertDelivered({ type: 'report', entityId: report.report_id, recipient });
      sent.push({ type: 'report', reportId: report.report_id, recipient });
    }
  }

  for (const workOrder of workOrderRows) {
    const alert = buildOverdueWorkOrderAlert({
      orderId: workOrder.order_id,
      hours: thresholdHours,
      roomName: workOrder.room_name || 'Unknown room',
      assetName: workOrder.asset_name || 'Unknown asset',
    });

    const recipients = collectAlertRecipients({
      reporterEmail: workOrder.reporter_email,
      technicianEmail: workOrder.technician_email,
      managerEmails,
    });
    const unsentRecipients = filterUnsentRecipients(recipients, {
      type: 'workOrder',
      entityId: workOrder.order_id,
      sentKeys,
      previouslyDeliveredKeys,
    });

    for (const recipient of unsentRecipients) {
      await sendEmail({
        to: recipient,
        subject: alert.title,
        title: alert.title,
        message: `${alert.message} This alert is intended for the technician, reporter, and manager roles.`,
        actionUrl: alert.actionUrl,
      });
      await markAlertDelivered({ type: 'workOrder', entityId: workOrder.order_id, recipient });
      sent.push({ type: 'workOrder', orderId: workOrder.order_id, recipient });
    }
  }

  return { sent, reportCount: reportRows.length, workOrderCount: workOrderRows.length };
}

module.exports = {
  buildOverdueReportAlert,
  buildOverdueWorkOrderAlert,
  collectAlertRecipients,
  buildAlertDeliveryKey,
  filterUnsentRecipients,
  getPreviouslyDeliveredAlertKeys,
  isOlderThanHours,
  markAlertDelivered,
  sendOverdueAlerts,
};
