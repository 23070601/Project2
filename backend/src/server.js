const app = require('./app');
const env = require('./config/env');
const { pool, checkConnection } = require('./config/db');
const bcrypt = require('bcryptjs');
const { sendOverdueAlerts } = require('./modules/notifications/overdueAlerts.service');

async function ensureSeedPasswords() {
  try {
    const defaultHash = await bcrypt.hash('123456', 10);
    const [result] = await pool.execute(
      `UPDATE Users SET password_hash = ? WHERE password_hash LIKE 'hash_placeholder_%' OR password_hash LIKE '$2a$10$K.23W7e%'`,
      [defaultHash]
    );
    if (result.affectedRows > 0) {
      console.log(`[DB] Updated default password (123456) for ${result.affectedRows} user(s).`);
    }
  } catch (err) {
    console.error('[DB] Password seed warning:', err.message);
  }
}

function startOverdueAlertsCron() {
  const intervalMs = Number(process.env.OVERDUE_ALERT_CRON_MS || 60 * 60 * 1000);
  let isRunning = false;

  const run = async () => {
    if (isRunning) return;
    isRunning = true;

    try {
      const result = await sendOverdueAlerts({ hours: Number(process.env.OVERDUE_ALERT_HOURS || 48) });
      if (result.reportCount || result.workOrderCount) {
        console.log(`[Alerts] Sent ${result.sent.length} overdue alert(s): ${result.reportCount} report(s), ${result.workOrderCount} work order(s).`);
      }
    } catch (error) {
      console.error('[Alerts] Failed to send overdue alerts:', error.message);
    } finally {
      isRunning = false;
    }
  };

  run();
  setInterval(run, intervalMs);
}

async function start() {
  try {
    await checkConnection();
    await ensureSeedPasswords();
    await ensureFaultReportsColumns();
    app.listen(env.port, () => {
      console.log(`[Server] VNUIS Asset Maintenance DSS API running on http://localhost:${env.port}`);
      console.log(`[Server] Environment: ${env.nodeEnv}`);
      console.log(`[Server] Health check: http://localhost:${env.port}/health`);
    });
    startOverdueAlertsCron();
  } catch (err) {
    console.error('[Server] Failed to start:', err.message);
    console.error('[Server] Make sure MySQL is running and .env is configured correctly (see .env.example).');
    process.exit(1);
  }
}

start();

