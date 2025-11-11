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
    // 1️⃣ Seed Roles
    const roles = ["user", "sales-person", "admin", "super-admin"];
    for (const name of roles) {
      await pool.query(`INSERT IGNORE INTO roles (name) VALUES (?)`, [name]);
    }

    // 2️⃣ Seed Permissions
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
      ["deleteAny", "user"],
    ];

    for (const [action, resource] of permissions) {
      await pool.query(
        `INSERT IGNORE INTO permissions (action, resource) VALUES (?, ?)`,
        [action, resource]
      );
    }

    // 3️⃣ Fetch role IDs
    const [roleRows] = await pool.query("SELECT id, name FROM roles");
    const roleMap = Object.fromEntries(roleRows.map(r => [r.name, r.id]));

    // 4️⃣ Fetch permission IDs
    const [permRows] = await pool.query(
      "SELECT id, action, resource FROM permissions"
    );

    // Helper to find permission IDs by resource pattern
    const permFor = (resource, actions) =>
      permRows
        .filter(p => p.resource === resource && actions.includes(p.action))
        .map(p => p.id);

    // 5️⃣ Role → permission links
    const roleLinks = [];

    // USER
    roleLinks.push(...permFor("rfq", ["createOwn", "readAny"]));

    // SALES-PERSON
    const salesPerms = [
      ...permFor("rfq", ["createOwn", "readAny", "updateAny"]),
      ...permFor("customer", ["createAny", "readAny", "updateAny"]),
      ...permFor("sales-funnel", ["createAny", "readAny", "updateAny"]),
      ...permFor("invoice", ["createAny", "readAny", "updateAny"]),
    ];

    // ADMIN
    const adminPerms = [
      ...salesPerms,
      ...permFor("rfq", ["deleteAny"]),
      ...permFor("customer", ["deleteAny"]),
      ...permFor("sales-funnel", ["deleteAny"]),
      ...permFor("invoice", ["deleteAny"]),
      ...permFor("user", ["readAny", "updateAny", "deleteAny"]),
    ];

    // SUPER-ADMIN gets everything
    const superAdminPerms = permRows.map(p => p.id);

    // 6️⃣ Insert mappings
    const insertRolePerms = async (roleName, permIds) => {
      const roleId = roleMap[roleName];
      for (const pid of permIds) {
        await pool.query(
          "INSERT IGNORE INTO role_permissions (role_id, permission_id) VALUES (?, ?)",
          [roleId, pid]
        );
      }
    };

    await insertRolePerms("user", roleLinks);
    await insertRolePerms("sales-person", salesPerms);
    await insertRolePerms("admin", adminPerms);
    await insertRolePerms("super-admin", superAdminPerms);

    console.log("✅ Default roles and permissions seeded (with mappings)");
  } catch (err) {
    console.error("❌ Error seeding roles/permissions:", err.message);
  }
}