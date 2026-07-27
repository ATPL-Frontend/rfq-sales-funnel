import { pool } from "../lib/dbconnect-mysql.js";

export const createPemItemPriceTable = async () => {
  const sql = `
  CREATE TABLE IF NOT EXISTS pem_item_prices (
    id INT AUTO_INCREMENT PRIMARY KEY,

    product_number VARCHAR(150) NOT NULL,
    normalized_product_number VARCHAR(150) NOT NULL,
    product_family VARCHAR(255),

    bag_quantity DECIMAL(18, 4),
    carton_quantity DECIMAL(18, 4),

    standard_price_per_1000 DECIMAL(18, 4),
    carton_price_per_1000 DECIMAL(18, 4),

    price_list_date DATE NULL,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    UNIQUE KEY uniq_pem_item_price (
      normalized_product_number
    ),

    INDEX idx_pem_price_product (
      product_number
    ),

    INDEX idx_pem_price_normalized_product (
      normalized_product_number
    )
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `;

  await pool.query(sql);
};
