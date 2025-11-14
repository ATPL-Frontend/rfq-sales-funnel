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

    console.log(
      "✅ Role, Permission, and Role_Permissions tables created (if not exist)"
    );
  } catch (err) {
    console.error("❌ Error creating role-permission tables:", err.message);
  }
}

/**
 * ✅ Seed default roles and permissions (if not exist)
 */
export async function seedDefaultRolesAndPermissions() {
  try {
    console.log("🌱 Seeding roles & permissions (safe mode)");

    // 1️⃣ Roles
    const roles = ["user", "sales-person", "admin", "super-admin"];
    for (const name of roles) {
      await pool.query(`INSERT IGNORE INTO roles (name) VALUES (?)`, [name]);
    }

    // 2️⃣ Permissions — with unique constraint now enforced
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

    await pool.query("START TRANSACTION");
    for (const [action, resource] of permissions) {
      await pool.query(
        `INSERT IGNORE INTO permissions (action, resource) VALUES (?, ?)`,
        [action, resource]
      );
    }

    // 3️⃣ Get IDs after inserts
    const [roleRows] = await pool.query("SELECT id, name FROM roles");
    const roleMap = Object.fromEntries(roleRows.map((r) => [r.name, r.id]));

    const [permRows] = await pool.query(
      "SELECT id, action, resource FROM permissions"
    );

    const permFor = (resource, actions) =>
      permRows
        .filter((p) => p.resource === resource && actions.includes(p.action))
        .map((p) => p.id);

    // 4️⃣ Role → Permission mapping
    const mappings = {
      user: [...permFor("rfq", ["createOwn", "readAny"])],
      "sales-person": [
        ...permFor("rfq", ["createOwn", "readAny", "updateAny"]),
        ...permFor("customer", ["createAny", "readAny", "updateAny"]),
        ...permFor("sales-funnel", ["createAny", "readAny", "updateAny"]),
        ...permFor("invoice", ["createAny", "readAny", "updateAny"]),
      ],
      admin: [
        ...permFor("rfq", ["createOwn", "readAny", "updateAny", "deleteAny"]),
        ...permFor("customer", [
          "createAny",
          "readAny",
          "updateAny",
          "deleteAny",
        ]),
        ...permFor("sales-funnel", [
          "createAny",
          "readAny",
          "updateAny",
          "deleteAny",
        ]),
        ...permFor("invoice", [
          "createAny",
          "readAny",
          "updateAny",
          "deleteAny",
        ]),
        ...permFor("user", ["readAny", "updateAny", "deleteAny"]),
      ],
      "super-admin": permRows.map((p) => p.id),
    };

    // 5️⃣ Insert role-permission mappings only if not exist
    for (const [roleName, permIds] of Object.entries(mappings)) {
      const roleId = roleMap[roleName];
      if (!roleId) continue;

      for (const pid of permIds) {
        await pool.query(
          `INSERT IGNORE INTO role_permissions (role_id, permission_id)
           SELECT ?, ? FROM DUAL
           WHERE NOT EXISTS (
             SELECT 1 FROM role_permissions WHERE role_id=? AND permission_id=?
           )`,
          [roleId, pid, roleId, pid]
        );
      }
    }

    await pool.query("COMMIT");
    console.log("✅ Roles & permissions seeded safely (no duplicates)");
  } catch (err) {
    await pool.query("ROLLBACK");
    console.error("❌ Seeding failed:", err.message);
  }
}
