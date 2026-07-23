const app = require('./app');
const env = require('./config/env');
const { checkConnection } = require('./config/db');

async function start() {
  try {
    await checkConnection();
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
