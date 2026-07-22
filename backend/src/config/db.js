const mysql = require('mysql2/promise');
const env = require('./env');

// Pool kết nối dùng chung cho toàn bộ app.
// Mọi repository đều import pool này và dùng pool.execute() (prepared statement)
// để tránh SQL injection.
const pool = mysql.createPool({
  host: env.db.host,
  port: env.db.port,
  user: env.db.user,
  password: env.db.password,
  database: env.db.database,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  dateStrings: true, // trả TIMESTAMP/DATETIME dạng string cho dễ xử lý ở frontend
});

async function checkConnection() {
  const conn = await pool.getConnection();
  try {
    await conn.ping();
    console.log(`[DB] Connected to MySQL database "${env.db.database}" at ${env.db.host}:${env.db.port}`);
  } finally {
    conn.release();
  }
}

module.exports = { pool, checkConnection };
