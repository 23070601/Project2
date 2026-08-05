const test = require('node:test');
const assert = require('node:assert/strict');
const { buildNotificationEmail, resolveRecipientEmail } = require('../src/modules/notifications/email.service');

test('builds a rich email payload for work order notifications', () => {
  const payload = buildNotificationEmail({
    to: 'tech@example.com',
    subject: 'New Work Order Assigned',
    title: 'New Work Order Assigned',
    message: 'You have been assigned to Work Order #123.',
    actionUrl: 'http://localhost:5500/frontend/technicians/AssignedTasks.html',
  });

  assert.equal(payload.to, 'tech@example.com');
  assert.match(payload.subject, /Work Order/i);
  assert.match(payload.text, /Work Order #123/i);
  assert.match(payload.html, /Work Order #123/i);
  assert.match(payload.html, /http:\/\/localhost:5500\/frontend\/technicians\/AssignedTasks.html/);
});

test('redirects notifications to a configured override recipient for testing', () => {
  process.env.NOTIFICATION_EMAIL_OVERRIDE = 'tester@example.com';

  try {
    assert.equal(resolveRecipientEmail({ to: 'original@example.com' }), 'tester@example.com');
  } finally {
    delete process.env.NOTIFICATION_EMAIL_OVERRIDE;
  }
});
