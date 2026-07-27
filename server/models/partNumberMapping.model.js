import { pool } from "../lib/dbconnect-mysql.js";

export const createPartNumberMappingTable = async () => {
  const sql = `
  CREATE TABLE IF NOT EXISTS part_number_mappings (
    id INT AUTO_INCREMENT PRIMARY KEY,

    captive_part_number VARCHAR(150) NOT NULL,
    normalized_captive_part_number VARCHAR(150) NOT NULL,

    pem_part_number VARCHAR(150) NOT NULL,
    normalized_pem_part_number VARCHAR(150) NOT NULL,

    description TEXT,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    UNIQUE KEY uniq_captive_part (
      normalized_captive_part_number
    ),

    INDEX idx_mapping_pem_part (
      normalized_pem_part_number
    )
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `;

  await pool.query(sql);
};
