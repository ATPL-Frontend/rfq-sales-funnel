import { pool } from "../lib/dbconnect-mysql.js";

export const createCustomerTable = async () => {
  const sql = `
  CREATE TABLE IF NOT EXISTS customers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name  VARCHAR(150) NOT NULL,
    email VARCHAR(150) NOT NULL,
    code  VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uniq_customer_email (email),
    UNIQUE KEY uniq_customer_name  (name),
    KEY idx_customer_code (code)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `;
  await pool.query(sql);
};
