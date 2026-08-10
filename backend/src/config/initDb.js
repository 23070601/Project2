const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const env = require('./env');

async function importDatabase() {
  const host = env.db.host;
  const port = env.db.port;
  const user = env.db.user;
  const password = env.db.password;
  const dbName = env.db.database;

  console.log(`Connecting to MySQL at ${host}:${port} as user "${user}"...`);

  const connection = await mysql.createConnection({
    host,
    port,
    user,
    password,
    multipleStatements: true,
  });

  try {
    const sqlPath = path.join(__dirname, '../../database/vnuis_asset_maintenance_dss.sql');
    console.log(`Reading SQL file: ${sqlPath}`);
    const sqlContent = fs.readFileSync(sqlPath, 'utf8');

    console.log('Importing main database schema & seed data...');

    // Split SQL content into non-trigger part and trigger part based on DELIMITER $$
    const delimiterSplit = sqlContent.split(/DELIMITER\s+\$\$/i);
    const mainSql = delimiterSplit[0];
    await connection.query(mainSql);
    console.log('Main schema and seed data imported.');

    if (delimiterSplit.length > 1) {
      const triggerSection = delimiterSplit[1].split(/DELIMITER\s+;/i)[0];
      const triggerStatements = triggerSection.split('$$');
      for (let stmt of triggerStatements) {
        stmt = stmt.trim();
        if (stmt) {
          try {
            await connection.query(stmt);
          } catch (trigErr) {
            console.warn(`Trigger creation notice: ${trigErr.message}`);
          }
        }
      }
      console.log('Triggers created.');
    }

    // Apply migrations
    const migrationsDir = path.join(__dirname, '../../../migrations');
    if (fs.existsSync(migrationsDir)) {
      const files = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql')).sort();
      for (const file of files) {
        const filePath = path.join(migrationsDir, file);
        console.log(`Applying migration: ${file}...`);
        const migSql = fs.readFileSync(filePath, 'utf8');
        try {
          await connection.query(`USE \`${dbName}\`; ${migSql}`);
          console.log(`Migration ${file} applied.`);
        } catch (migErr) {
          console.warn(`Migration ${file} notice: ${migErr.message}`);
        }
      }
    }

    console.log('All database migrations completed successfully!');
  } finally {
    await connection.end();
  }
}

if (require.main === module) {
  importDatabase().catch(err => {
    console.error('Failed to import database:', err.message);
    process.exit(1);
  });
}

module.exports = { importDatabase };
