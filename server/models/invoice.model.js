import { pool } from "../lib/dbconnect-mysql.js";

/** Utility to match FK column types exactly */
async function getColumnType(table, column) {
  const [rows] = await pool.query(
    `SELECT COLUMN_TYPE
     FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = ?
       AND COLUMN_NAME = ?
     LIMIT 1`,
    [table, column]
  );
  if (!rows.length) throw new Error(`${table}.${column} not found`);
  return rows[0].COLUMN_TYPE; // e.g. "int(11) unsigned" or "bigint(20)"
}

export const createInvoiceTable = async () => {
  const customerIdType = await getColumnType("customers", "id");
  const sql = `
  CREATE TABLE IF NOT EXISTS invoices (
    id INT AUTO_INCREMENT PRIMARY KEY,
    invoice_date DATE NOT NULL,
    customer_id ${customerIdType} NOT NULL,
    amount DECIMAL(20,3) NOT NULL,
    currency ENUM('AUD','USD') NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_invoice_customer
      FOREIGN KEY (customer_id) REFERENCES customers(id)
      ON UPDATE CASCADE ON DELETE RESTRICT,

    KEY idx_invoice_date (invoice_date),
    KEY idx_invoice_customer (customer_id),
    KEY idx_invoice_currency (currency)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `;
  await pool.query(sql);
};
