import { pool } from "../lib/dbconnect-mysql.js";

export const createCablePriceTables = async () => {
  const sql = `
    CREATE TABLE IF NOT EXISTS cable_prices (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      vendor_code VARCHAR(30) NOT NULL DEFAULT '3F',
      cable_standard VARCHAR(50) NOT NULL,
      section_name VARCHAR(255) NULL,
      description VARCHAR(1000) NOT NULL,
      color_name VARCHAR(255) NULL,
      unit_price DECIMAL(18,6) NOT NULL,
      currency VARCHAR(10) NOT NULL DEFAULT 'USD',
      price_basis VARCHAR(255) NULL,
      packing_roll VARCHAR(100) NULL,
      moq VARCHAR(100) NULL,
      file_name VARCHAR(255) NOT NULL,
      sheet_name VARCHAR(255) NOT NULL,
      source_row INT NULL,
      imported_by BIGINT NULL,
      imported_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      INDEX idx_cable_vendor (
        vendor_code
      ),
      INDEX idx_cable_standard (
        cable_standard
      ),
      INDEX idx_cable_vendor_standard (
        vendor_code,
        cable_standard
      )
    );
  `;

  await pool.query(sql);
};
