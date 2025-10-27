import { pool } from "../lib/dbconnect-mysql.js";

export const createUserTable = async () => {
  const sql = `
  CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    short_form VARCHAR(20) NOT NULL,
    password VARCHAR(255) NOT NULL,
    token VARCHAR(255),
    role JSON NOT NULL,
    otp_code VARCHAR(10),
    otp_expires DATETIME,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );
  `;
  await pool.query(sql);
};
