import { pool } from "../lib/dbconnect-mysql.js";

/**
 * 📜 GET /api/roles — list all roles
 */
export async function listRoles(req, res) {
  try {
    const [rows] = await pool.query("SELECT id, name FROM roles ORDER BY id ASC");
    res.json({ success: true, data: rows});
  } catch (err) {
    console.error("listRoles error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
}

/**
 * 📜 GET /api/permissions — list all permissions
 */
export async function listPermissions(req, res) {
  try {
    const [rows] = await pool.query("SELECT id, action, resource FROM permissions ORDER BY id ASC");
    res.json({ success: true, data: rows});
  } catch (err) {
    console.error("listPermissions error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
}

/**
 * 🧩 GET /api/roles/:id/permissions — show permissions of a specific role
 */
export async function getRolePermissions(req, res) {
  try {
    const roleId = Number(req.params.id);

    // Check role exists
    const [[role]] = await pool.query("SELECT id, name FROM roles WHERE id=?", [roleId]);
    if (!role) return res.status(404).json({ success: false, message: "Role not found" });

    // Fetch permissions
    const [permissions] = await pool.query(
      `SELECT p.id, p.action, p.resource
       FROM role_permissions rp
       JOIN permissions p ON rp.permission_id = p.id
       WHERE rp.role_id=?`,
      [roleId]
    );

    res.json({ success: true, role: role.name, permissions });
  } catch (err) {
    console.error("getRolePermissions error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
}

/**
 * 🧷 POST /api/roles/:id/permissions — assign permissions to a role
 * Body: { "permission_ids": [1,2,3] }
 */
export async function assignPermissions(req, res) {
  try {
    const roleId = Number(req.params.id);
    const { permission_ids } = req.body;

    if (!Array.isArray(permission_ids) || permission_ids.length === 0) {
      return res.status(400).json({ success: false, message: "permission_ids must be a non-empty array" });
    }

    // Ensure role exists
    const [[role]] = await pool.query("SELECT id FROM roles WHERE id=?", [roleId]);
    if (!role) {
      return res.status(404).json({ success: false, message: "Role not found" });
    }

    // Remove existing permissions for this role
    await pool.query("DELETE FROM role_permissions WHERE role_id=?", [roleId]);

    // Insert new mappings
    const values = permission_ids.map(pid => [roleId, pid]);
    await pool.query("INSERT INTO role_permissions (role_id, permission_id) VALUES ?", [values]);

    res.json({ success: true, message: "Permissions assigned to role successfully" });
  } catch (err) {
    console.error("assignPermissions error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
}

/**
 * 🧾 GET /api/role-permissions — view all role-permission mappings
 */
export async function listRolePermissions(req, res) {
  try {
    const [rows] = await pool.query(`
      SELECT r.name AS role, p.action, p.resource
      FROM role_permissions rp
      JOIN roles r ON rp.role_id = r.id
      JOIN permissions p ON rp.permission_id = p.id
      ORDER BY r.name ASC, p.resource ASC;
    `);
    res.json({ success: true, data: rows});
  } catch (err) {
    console.error("listRolePermissions error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
}
