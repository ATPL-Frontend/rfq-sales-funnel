// models/user.model.js
import { pool } from "../lib/dbconnect-mysql.js";

/**
 * ✅ Creates the `users` table (if not exists)
 * Each user belongs to a single role via `role_id` (FK → roles.id).
 * 
 * Fields:
 * - id: primary key
 * - name, email, short_form: identity fields
 * - password: bcrypt hash
 * - token: JWT or session token (optional)
 * - role_id: foreign key to `roles`
 * - otp_code / otp_expires: for temporary login verification
 * - is_active / deactivated_at: soft deletion support
 * - created_at / updated_at: timestamps
 */
export const createUserTable = async () => {
  const sql = `
  CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    short_form VARCHAR(20) NOT NULL,
    password VARCHAR(255) NOT NULL,
    token VARCHAR(512),
    role_id INT NULL,
    otp_code VARCHAR(10),
    otp_expires DATETIME,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    deactivated_at DATETIME NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_users_roles FOREIGN KEY (role_id)
      REFERENCES roles(id)
      ON DELETE SET NULL
      ON UPDATE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `;

  try {
    await pool.query(sql);
    console.log("✅ Users table created (if not exists)");
  } catch (err) {
    console.error("❌ Failed to create users table:", err.message);
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
      `INSERT INTO users (name, email, short_form, password, role_id)
       VALUES (?, ?, ?, ?, ?)`,
      ["Fayezur Rahman", "frahman@ampec.com.au", "FR", hashed, role.id]
    );

    console.log("✅ Default super-admin user created:");
    console.log("   Email: frahman@ampec.com.au");
    console.log("   Password: 12345678");
  } catch (err) {
    console.error("❌ Failed to seed super-admin user:", err.message);
  }
};
