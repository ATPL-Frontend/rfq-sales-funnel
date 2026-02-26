import { pool } from "../lib/dbconnect-mysql.js";

export const createUserTable = async () => {
  const sql = `
  CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(150) NULL UNIQUE,
    short_form VARCHAR(20),
    password VARCHAR(255) NULL,
    token VARCHAR(512),
    otp_code VARCHAR(10),
    otp_expires DATETIME,
    user_type ENUM('system_user', 'sales_person') NOT NULL DEFAULT 'system_user',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    deactivated_at DATETIME NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `;

  try {
    await pool.query(sql);
    console.log("✅ Users table created (if not exists)");
  } catch (err) {
    console.error("❌ Failed to create users table:", err.message);
  }
};

export const createUserRoleTable = async () => {
  const sql = `CREATE TABLE IF NOT EXISTS user_roles (
    id INT AUTO_INCREMENT PRIMARY KEY,    
    user_id INT NOT NULL,
      role_id INT NOT NULL,
      UNIQUE KEY unique_user_role (user_id, role_id),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `;
  try {
    await pool.query(sql);
    console.log("✅ User-Roles junction table created (if not exists)");
  } catch (err) {
    console.error("❌ Failed to create User-Roles table:", err.message);
  }
};

/**
 * ✅ Automatically seed a default super-admin user (if not exists)
 * This ensures your app always has a top-level admin account.
 */
export const seedSuperAdminUser = async () => {
  try {
    // Look up the 'super-admin' role ID
    const [[role]] = await pool.query(
      `SELECT id FROM roles WHERE name = 'super-admin' LIMIT 1`
    );

    if (!role) {
      console.warn("⚠️ No 'super-admin' role found. Seeding skipped.");
      return;
    }

    // Check if super-admin user already exists
    const [exists] = await pool.query(
      "SELECT id FROM users WHERE email = ? LIMIT 1",
      ["frahman@ampec.com.au"]
    );

    if (exists.length > 0) {
      console.log("✅ Super-admin user already exists, skipping seed");
      return;
    }

    // Hash password securely
    const bcrypt = await import("bcrypt");
    const hashed = await bcrypt.default.hash("12345678", 10);

    await pool.query(
      `INSERT INTO users (name, email, short_form, password)
       VALUES (?, ?, ?, ?)`,
      ["Fayezur Rahman", "frahman@ampec.com.au", "FR", hashed]
    );

    const [result] = await pool.query(
      `INSERT INTO users (name, email, short_form, password)
      VALUES (?, ?, ?, ?)`,
      ["Fayezur Rahman", "frahman@ampec.com.au", "FR", hashed]
    );

    const userId = result.insertId;

    await pool.query(
      "INSERT IGNORE INTO user_roles (user_id, role_id) VALUES (?, ?)",
      [userId, role.id]
    );

    console.log("✅ Default super-admin user created:");
  } catch (err) {
    console.error("❌ Failed to seed super-admin user:", err.message);
  }
};
