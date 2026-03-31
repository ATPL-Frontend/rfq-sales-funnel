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
    quantity DECIMAL(12,0) NOT NULL,
    price VARCHAR(100) NULL,
    currency ENUM('AUD', 'USD') NOT NULL DEFAULT 'AUD',
    work_type ENUM(
      'Buy & Sale',
      'Cable Assembly',
      'Box Build',
      'Engineering Work'
    ) NOT NULL,
    progress VARCHAR(20) NOT NULL DEFAULT '0',
    end_date DATE NULL,
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
    KEY idx_rfq_dates (receive_date, start_date, end_date),
    KEY idx_rfq_work_type (work_type)
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

export const createRFQContentsTable = async () => {
  const sql = `
  CREATE TABLE IF NOT EXISTS rfq_contents (
    id INT AUTO_INCREMENT PRIMARY KEY,
    rfq_id INT NOT NULL,
    content VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_rfq_contents_rfq
      FOREIGN KEY (rfq_id) REFERENCES rfq(id)
      ON UPDATE CASCADE ON DELETE CASCADE,
    KEY idx_rfq_contents_rfq_id (rfq_id),
    KEY idx_rfq_contents_content (content),
    KEY idx_rfq_contents_content_rfq (content, rfq_id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `;

  await pool.query(sql);
};