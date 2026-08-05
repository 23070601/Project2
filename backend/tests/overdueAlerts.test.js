const test = require('node:test');
const assert = require('node:assert/strict');
const {
  buildOverdueReportAlert,
  buildOverdueWorkOrderAlert,
  collectAlertRecipients,
  buildAlertDeliveryKey,
  filterUnsentRecipients,
  isOlderThanHours,
} = require('../src/modules/notifications/overdueAlerts.service');

test('builds a clear alert for stale fault reports', () => {
  const alert = buildOverdueReportAlert({ reportId: 12, hours: 48, roomName: 'R101', assetName: 'Projector' });

  assert.match(alert.title, /Overdue Fault Report/i);
  assert.match(alert.message, /report #12/i);
  assert.match(alert.message, /48/i);
  assert.match(alert.message, /R101/i);
});

test('builds a clear alert for stale work orders', () => {
  const alert = buildOverdueWorkOrderAlert({ orderId: 7, hours: 48, roomName: 'R402', assetName: 'Aircon' });

  assert.match(alert.title, /Overdue Work Order/i);
  assert.match(alert.message, /work order #7/i);
  assert.match(alert.message, /48/i);
  assert.match(alert.message, /R402/i);
});

test('collects all distinct recipients for overdue alerts', () => {
  const recipients = collectAlertRecipients({
    reporterEmail: 'reporter@example.com',
    technicianEmail: 'tech@example.com',
    managerEmails: ['manager1@example.com', 'manager2@example.com', 'manager1@example.com'],
  });

  assert.deepEqual(recipients, ['reporter@example.com', 'tech@example.com', 'manager1@example.com', 'manager2@example.com']);
});

test('builds a stable delivery key for each alert recipient', () => {
  assert.equal(buildAlertDeliveryKey({ type: 'report', entityId: 12, recipient: 'Manager@Example.com' }), 'report:12:manager@example.com');
  assert.equal(buildAlertDeliveryKey({ type: 'workOrder', entityId: 7, recipient: 'Tech@Example.com' }), 'workOrder:7:tech@example.com');
});

test('filters recipients that were already sent in this run', () => {
  const sentKeys = new Set(['report:12:manager@example.com']);
  const recipients = filterUnsentRecipients(['Manager@Example.com', 'reporter@example.com'], {
    type: 'report',
    entityId: 12,
    sentKeys,
  });

  assert.deepEqual(recipients, ['reporter@example.com']);
});

test('filters recipients that were already delivered in a previous run', () => {
  const recipients = filterUnsentRecipients(['Manager@Example.com', 'reporter@example.com'], {
    type: 'report',
    entityId: 12,
    sentKeys: new Set(),
    previouslyDeliveredKeys: ['report:12:manager@example.com'],
  });

  assert.deepEqual(recipients, ['reporter@example.com']);
});

test('treats timestamps older than the configured threshold as overdue', () => {
  const recent = new Date(Date.now() - 47 * 60 * 60 * 1000).toISOString();
  const stale = new Date(Date.now() - 49 * 60 * 60 * 1000).toISOString();

  assert.equal(isOlderThanHours(recent, 48), false);
  assert.equal(isOlderThanHours(stale, 48), true);
  assert.equal(isOlderThanHours('not-a-date', 48), false);
});
