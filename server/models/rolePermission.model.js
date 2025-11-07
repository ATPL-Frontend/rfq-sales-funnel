import { pool } from "../lib/dbconnect-mysql.js";

/**
 * ✅ Create role, permission, and role_permissions tables
 */
export async function createRolePermissionTables() {
  try {
    // 1️⃣ Roles table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS roles (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(50) UNIQUE NOT NULL
      );
    `);

    // 2️⃣ Permissions table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS permissions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        action VARCHAR(50) NOT NULL,
        resource VARCHAR(50) NOT NULL
      );
    `);

    // 3️⃣ Pivot table (many-to-many)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS role_permissions (
        role_id INT NOT NULL,
        permission_id INT NOT NULL,
        PRIMARY KEY (role_id, permission_id),
        FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
        FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE
      );
    `);

    console.log("✅ Role, Permission, and Role_Permissions tables created (if not exist)");
  } catch (err) {
    console.error("❌ Error creating role-permission tables:", err.message);
  }
}

/**
 * ✅ Seed default roles and permissions (if not exist)
 */
export async function seedDefaultRolesAndPermissions() {
  try {
    // Default roles
    const roles = ["user", "sales-person", "admin", "super-admin"];
    for (const name of roles) {
      await pool.query(`INSERT IGNORE INTO roles (name) VALUES (?)`, [name]);
    }

    // Default permissions
    const permissions = [
      ["createOwn", "rfq"],
      ["readAny", "rfq"],
      ["updateAny", "rfq"],
      ["deleteAny", "rfq"],

      ["createAny", "customer"],
      ["readAny", "customer"],
      ["updateAny", "customer"],
      ["deleteAny", "customer"],

      ["createAny", "sales-funnel"],
      ["readAny", "sales-funnel"],
      ["updateAny", "sales-funnel"],
      ["deleteAny", "sales-funnel"],

      ["createAny", "invoice"],
      ["readAny", "invoice"],
      ["updateAny", "invoice"],
      ["deleteAny", "invoice"],

      ["readAny", "user"],
      ["updateAny", "user"],
      ["deleteAny", "user"]
    ];

    for (const [action, resource] of permissions) {
      await pool.query(
        `INSERT IGNORE INTO permissions (action, resource) VALUES (?, ?)`,
        [action, resource]
      );
    }

    console.log("✅ Default roles and permissions seeded (if not exist)");
  } catch (err) {
    console.error("❌ Error seeding roles/permissions:", err.message);
  }
}
