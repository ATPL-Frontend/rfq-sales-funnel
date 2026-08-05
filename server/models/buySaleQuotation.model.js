import { pool } from "../lib/dbconnect-mysql.js";

export const createBuySaleQuotationTable = async () => {
  const sql = `
  CREATE TABLE IF NOT EXISTS buy_sale_quotations (
    id INT AUTO_INCREMENT PRIMARY KEY,

    ampec_part_number VARCHAR(150),
    customer_part_number VARCHAR(150),
    description TEXT,

    quantity DECIMAL(18, 4) NOT NULL DEFAULT 0,
    unit_price_aud_ex_gst DECIMAL(18, 8) NOT NULL DEFAULT 0,

    lead_time VARCHAR(100),
    ncnr VARCHAR(20),
    remark TEXT,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `;

  await pool.query(sql);
};
