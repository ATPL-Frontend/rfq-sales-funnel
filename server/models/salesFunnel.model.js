import { pool } from "../lib/dbconnect-mysql.js";

async function getUsersIdColumnDef() {
  const [rows] = await pool.query(`
    SELECT COLUMN_TYPE
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME='users' AND COLUMN_NAME='id'
    LIMIT 1
  `);
  if (!rows.length) throw new Error("users.id not found");
  return rows[0].COLUMN_TYPE; 
}

export const createSalesFunnelTable = async () => {
  const userIdColType = await getUsersIdColumnDef();
  const sql = `
  CREATE TABLE IF NOT EXISTS sales_funnel (
    id INT AUTO_INCREMENT PRIMARY KEY,
    rfq_id INT NOT NULL,
    quote_date DATE NOT NULL,
    sent_by ${userIdColType} NOT NULL,
    description TEXT,
    exp_win_date DATE NOT NULL,
    last_updated TIMESTAMP NULL DEFAULT NULL,
    status VARCHAR(50),
    remarks TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_sf_rfq
      FOREIGN KEY (rfq_id) REFERENCES rfq(id)
      ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT fk_sf_sent_by
      FOREIGN KEY (sent_by) REFERENCES users(id)
      ON UPDATE CASCADE ON DELETE RESTRICT,
    KEY idx_sf_rfq (rfq_id),
    KEY idx_sf_dates (quote_date, exp_win_date),
    KEY idx_sf_status (status)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `;
  await pool.query(sql);
};