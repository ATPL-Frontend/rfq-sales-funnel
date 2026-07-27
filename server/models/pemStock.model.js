import { pool } from "../lib/dbconnect-mysql.js";

export const createPemStockTable = async () => {
  const sql = `
  CREATE TABLE IF NOT EXISTS pem_stock (
    id INT AUTO_INCREMENT PRIMARY KEY,

    part_number VARCHAR(150) NOT NULL,
    normalized_part_number VARCHAR(150) NOT NULL,

    nett_inventory DECIMAL(18, 4) NOT NULL DEFAULT 0,
    stock_location VARCHAR(100) NOT NULL DEFAULT 'Kunshan',

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    UNIQUE KEY uniq_pem_stock_part_location (
      normalized_part_number,
      stock_location
    ),

    INDEX idx_pem_stock_part_number (
      part_number
    ),

    INDEX idx_pem_stock_normalized_part (
      normalized_part_number
    ),

    INDEX idx_pem_stock_location (
      stock_location
    )
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `;

  await pool.query(sql);
};