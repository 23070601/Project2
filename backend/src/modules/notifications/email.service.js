const nodemailer = require('nodemailer');
const env = require('../../config/env');
const links = require('./notificationLinks');

function resolveRecipientEmail({ to }) {
  const override = (process.env.NOTIFICATION_EMAIL_OVERRIDE || '').trim();
  if (override) return override;
  return to;
}

function buildNotificationEmail({ to, subject, title, message, actionUrl }) {
  const safeSubject = subject || 'VNU-IS Notification';
  const safeTitle = title || 'New notification';
  const safeMessage = message || 'You have a new notification.';
  const safeActionUrl = actionUrl || links.userNotifications;

  return {
    to: resolveRecipientEmail({ to }),
    subject: safeSubject,
    text: `${safeTitle}\n\n${safeMessage}\n\nOpen the system: ${safeActionUrl}`,
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #1f2937;">
        <h2 style="margin-bottom: 8px;">${safeTitle}</h2>
        <p>${safeMessage}</p>
        <p style="margin-top: 16px;">
          <a href="${safeActionUrl}" style="display:inline-block;padding:10px 16px;background:#004482;color:#fff;text-decoration:none;border-radius:6px;">Open VNU-IS</a>
        </p>
      </div>
    `,
  };
}

function createTransport() {
  const smtpHost = String(env.smtp?.host || process.env.SMTP_HOST || '').trim();
  const smtpPort = Number(env.smtp?.port || process.env.SMTP_PORT || 587);
  const smtpUser = String(env.smtp?.user || process.env.SMTP_USER || '').trim();
  const smtpPass = String(env.smtp?.pass || process.env.SMTP_PASS || '').trim().replace(/\s+/g, '');

  if (!smtpHost || !smtpUser || !smtpPass) {
    return null;
  }

  return nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: smtpPort === 465,
    auth: {
      user: smtpUser,
      pass: smtpPass,
    },
  });
}

async function sendEmail({ to, subject, title, message, actionUrl }) {
  if (!to) return { sent: false, reason: 'No recipient' };

  const transport = createTransport();
  if (!transport) {
    return { sent: false, reason: 'SMTP not configured' };
  }

  const mailOptions = buildNotificationEmail({ to, subject, title, message, actionUrl });

  try {
    await transport.sendMail({
      from: env.smtp?.from || process.env.SMTP_FROM || 'noreply@vnu.edu.vn',
      ...mailOptions,
    });
    return { sent: true, messageId: 'queued' };
  } catch (error) {
    return { sent: false, reason: error.message };
  }
}

module.exports = {
  buildNotificationEmail,
  resolveRecipientEmail,
  sendEmail,
};
