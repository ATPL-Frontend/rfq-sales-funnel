import { pool } from "../lib/dbconnect-mysql.js";

async function getUsersIdColumnDef() {
  const [rows] = await pool.query(`
    SELECT COLUMN_TYPE
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME='users' AND COLUMN_NAME='id'
    LIMIT 1
  `);
  if (!rows.length) throw new Error("users.id not found");
  // COLUMN_TYPE e.g. "int(11) unsigned" or "bigint(20)" or "char(36)"
  return rows[0].COLUMN_TYPE;
}

export const createRFQTable = async () => {
  const userIdColType = await getUsersIdColumnDef();
  const sql = `
  CREATE TABLE IF NOT EXISTS rfq (
    id INT AUTO_INCREMENT PRIMARY KEY,
    receive_date DATE NOT NULL,
    start_date   DATE NOT NULL,
    customer_id  INT NOT NULL,
    salesperson_id ${userIdColType} NOT NULL,
    quantity DECIMAL(12,2) NOT NULL,
    price    VARCHAR(100) NOT NULL,
    progress ENUM(
      'Waiting for Drawing',
      'Waiting for Customer\\'s BOM',
      'Waiting for vendor quotation',
      'Waiting for Salesperson',
      'Waiting for Drawing Revision',
      'Salesperson will cover rest',
      'Partially Submitted',
      'Sent to Salesperson (100%)',
      'Sent to Customer (Done)'
    ) NOT NULL DEFAULT 'Waiting for Drawing',
    end_date DATE NOT NULL,
    rfq_location VARCHAR(255),
    remarks TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_rfq_customer
      FOREIGN KEY (customer_id) REFERENCES customers(id)
      ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT fk_rfq_salesperson
      FOREIGN KEY (salesperson_id) REFERENCES users(id)
      ON UPDATE CASCADE ON DELETE RESTRICT,
    KEY idx_rfq_customer (customer_id),
    KEY idx_rfq_salesperson (salesperson_id),
    KEY idx_rfq_progress (progress),
    KEY idx_rfq_dates (receive_date, start_date, end_date)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `;
  await pool.query(sql);
};

export const createRFQPreparedPeopleTable = async () => {
  const userIdColType = await getUsersIdColumnDef();
  const sql = `
  CREATE TABLE IF NOT EXISTS rfq_prepared_people (
    rfq_id INT NOT NULL,
    user_id ${userIdColType} NOT NULL,
    PRIMARY KEY (rfq_id, user_id),
    CONSTRAINT fk_rpp_rfq  FOREIGN KEY (rfq_id) REFERENCES rfq(id)
      ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT fk_rpp_user FOREIGN KEY (user_id) REFERENCES users(id)
      ON UPDATE CASCADE ON DELETE RESTRICT,
    KEY idx_rpp_user (user_id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `;
  await pool.query(sql);
};
