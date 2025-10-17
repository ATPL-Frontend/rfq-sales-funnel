import { pool } from '../lib/dbconnect-mysql.js';

export async function createUserTable() {
  const sql = `
    CREATE TABLE IF NOT EXISTS users (
      id BIGINT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      email VARCHAR(255) NOT NULL UNIQUE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `;
  try {
    await pool.query(sql);
    console.log('✅ users table checked/created (if not existed).');
  } catch (err) {
    console.error('❌ Failed to create users table:', err);
    throw err;
  }
}
