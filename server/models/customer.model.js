import { pool } from "../lib/dbconnect-mysql.js";

export const createCustomerTable = async () => {
  const sql = `
  CREATE TABLE IF NOT EXISTS customers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name  VARCHAR(150) NOT NULL,
    email JSON,
    web_address VARCHAR(255),
    code VARCHAR(50) UNIQUE,
    salesperson_id INT,
    currency ENUM('AUD','USD') NOT NULL DEFAULT 'AUD',
    gst BOOLEAN NOT NULL DEFAULT TRUE,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_customer_salesperson
      FOREIGN KEY (salesperson_id) REFERENCES users(id)
      ON DELETE SET NULL
      ON UPDATE CASCADE,

    UNIQUE KEY uniq_customer_code (code)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `;
  await pool.query(sql);
};
