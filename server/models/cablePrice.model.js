import { pool } from "../lib/dbconnect-mysql.js";

export const createCablePriceTables = async () => {
  const sql = `
    CREATE TABLE IF NOT EXISTS cable_prices (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      vendor_code VARCHAR(30) NOT NULL DEFAULT '3F',
      cable_standard VARCHAR(50) NOT NULL,
      awg SMALLINT UNSIGNED NULL,
      section_name VARCHAR(255) NULL,
      description VARCHAR(1000) NOT NULL,
      color_name VARCHAR(255) NULL,
      color_type ENUM('single', 'dual') NULL,
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
      INDEX idx_cable_awg (
        awg
      ),
      INDEX idx_cable_color_type (
        color_type
      ),
      INDEX idx_cable_vendor_standard (
        vendor_code,
        cable_standard
      ),
      INDEX idx_cable_filter (
        vendor_code,
        cable_standard,
        awg,
        color_type
      )
    );
  `;

  await pool.query(sql);
};

export async function getCablePriceFilterOptions(vendorCode = "3F") {
  const [standardRows] = await pool.query(
    `
        SELECT DISTINCT
          cable_standard
        FROM cable_prices
        WHERE vendor_code = ?
          AND cable_standard IS NOT NULL
          AND cable_standard <> ''
        ORDER BY
          CAST(
            REPLACE(
              cable_standard,
              'UL',
              ''
            ) AS UNSIGNED
          ) ASC
      `,
    [vendorCode],
  );

  const [awgRows] = await pool.query(
    `
        SELECT DISTINCT
          awg
        FROM cable_prices
        WHERE vendor_code = ?
          AND awg IS NOT NULL
        ORDER BY awg ASC
      `,
    [vendorCode],
  );

  return {
    cable_standards: standardRows.map((row) => row.cable_standard),
    awgs: awgRows.map((row) => Number(row.awg)),
    color_types: [
      {
        value: "single",
        label: "Single Color",
      },
      {
        value: "dual",
        label: "Dual Color",
      },
    ],
  };
}
