const app = require('./app');
const env = require('./config/env');
const { pool, checkConnection } = require('./config/db');
const bcrypt = require('bcryptjs');

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

async function start() {
  try {
    await checkConnection();
    await ensureSeedPasswords();
    app.listen(env.port, () => {
      console.log(`[Server] VNUIS Asset Maintenance DSS API running on http://localhost:${env.port}`);
      console.log(`[Server] Environment: ${env.nodeEnv}`);
      console.log(`[Server] Health check: http://localhost:${env.port}/health`);
    });
  } catch (err) {
    console.error('[Server] Failed to start:', err.message);
    console.error('[Server] Make sure MySQL is running and .env is configured correctly (see .env.example).');
    process.exit(1);
  }
}

start();

