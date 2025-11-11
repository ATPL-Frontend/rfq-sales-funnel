import bcrypt from "bcrypt";
import { pool } from "../lib/dbconnect-mysql.js";

/** Helper: check if the authenticated user has a given role */
function hasRole(req, roleName) {
  return req.user?.role === roleName || req.user?.role_name === roleName;
}

/** GET /api/users — list all users (admin/super-admin only) */
export async function listUsers(req, res) {
  try {
    if (!hasRole(req, "admin") && !hasRole(req, "super-admin")) {
      return res.status(403).json({ success: false, message: "Forbidden: insufficient permissions" });
    }

    const q = (req.query.q || "").trim();
    const limit = Math.min(parseInt(req.query.limit || "50", 10), 200);
    const page = Math.max(parseInt(req.query.page || "1", 10), 1);
    const offset = (page - 1) * limit;

    let where = "";
    const params = [];

    if (q) {
      where = "WHERE (u.name LIKE ? OR u.email LIKE ? OR u.short_form LIKE ?)";
      const like = `%${q}%`;
      params.push(like, like, like);
    }

    const [rows] = await pool.query(
      `SELECT 
         u.id, u.name, u.email, u.short_form, u.created_at, r.name AS role_name
       FROM users u
       LEFT JOIN roles r ON u.role_id = r.id
       ${where}
       ORDER BY u.id DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    const [[{ total }]] = await pool.query(
      `SELECT COUNT(*) AS total 
       FROM users u
       ${where}`,
      params
    );

    res.json({
      success: true,
      data: rows,
      page,
      limit,
      total,
      total_pages: Math.ceil(total / limit),
    });
  } catch (err) {
    console.error("listUsers error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
}

/** GET /api/users/:id — get single user info (admin/super-admin) */
export async function getUserById(req, res) {
  try {
    if (!hasRole(req, "admin") && !hasRole(req, "super-admin")) {
      return res.status(403).json({ success: false, message: "Forbidden: insufficient permissions" });
    }

    const id = Number(req.params.id);
    const [rows] = await pool.query(
      `SELECT u.id, u.name, u.email, u.short_form, u.created_at, r.name AS role_name
       FROM users u
       LEFT JOIN roles r ON u.role_id = r.id
       WHERE u.id = ?`,
      [id]
    );

    if (!rows.length) return res.status(404).json({ success: false, message: "User not found" });
    res.json({ success: true, data: rows[0]});
  } catch (err) {
    console.error("getUserById error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
}

/** GET /api/users/me — get own profile (authenticated) */
export async function getMe(req, res) {
  try {
    const id = req.user?.id;
    if (!id) return res.status(401).json({ success: false, message: "Not authenticated" });

    const [rows] = await pool.query(
      `SELECT u.id, u.name, u.email, u.short_form, u.created_at, r.name AS role_name
       FROM users u
       LEFT JOIN roles r ON u.role_id = r.id
       WHERE u.id = ?`,
      [id]
    );

    if (!rows.length) return res.status(404).json({ success: false, message: "User not found" });
    res.json({ success: true, data: rows[0]});
  } catch (err) {
    console.error("getMe error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
}

/** PUT /api/users/:id — update user (super-admin only for roles, admin for info) */
export async function updateUser(req, res) {
  try {
    const targetId = Number(req.params.id);
    const actorId = req.user?.id;

    const isSuper = hasRole(req, "super-admin");
    const isAdmin = hasRole(req, "admin");

    // Prevent ordinary users from editing others
    if (!isSuper && !isAdmin && actorId !== targetId) {
      return res.status(403).json({ success: false, message: "Forbidden: insufficient permissions" });
    }

    // Fetch existing user
    const [[target]] = await pool.query(
      `SELECT u.id, u.name, u.email, u.short_form, u.password, u.role_id, r.name AS role_name
       FROM users u
       LEFT JOIN roles r ON u.role_id = r.id
       WHERE u.id = ?`,
      [targetId]
    );
    if (!target) return res.status(404).json({ success: false, message: "User not found" });

    // Extract fields
    let { name, short_form, password, role } = req.body || {};
    const updates = [];
    const params = [];

    // Basic info updates
    if (name !== undefined) {
      name = String(name).trim();
      if (!name) return res.status(400).json({ success: false, message: "Name cannot be empty" });
      updates.push("name=?");
      params.push(name);
    }

    if (short_form !== undefined) {
      short_form = String(short_form).trim();
      if (!short_form) return res.status(400).json({ success: false, message: "Short form cannot be empty" });
      updates.push("short_form=?");
      params.push(short_form);
    }

    // Role changes (super-admin only)
    if (role !== undefined) {
      if (!isSuper) {
        return res.status(403).json({ success: false, message: "Only super-admin can change roles" });
      }

      const [roleRows] = await pool.query("SELECT id FROM roles WHERE name=?", [role]);
      const roleId = roleRows[0]?.id;
      if (!roleId) {
        return res.status(400).json({ success: false, message: `Invalid role: ${role}` });
      }

      // Prevent removing the last super-admin
      if (target.role_name === "super-admin" && role !== "super-admin") {
        const [[row]] = await pool.query(
          "SELECT COUNT(*) AS cnt FROM users u JOIN roles r ON u.role_id = r.id WHERE r.name='super-admin'"
        );
        if (Number(row.cnt) <= 1) {
          return res.status(400).json({
            success: false,
            message: "Cannot remove role: this is the last super-admin",
          });
        }
      }

      updates.push("role_id=?");
      params.push(roleId);
    }

    // Password change
    if (password !== undefined) {
      password = String(password);
      if (password.length < 8) {
        return res.status(400).json({ success: false, message: "Password must be at least 8 characters" });
      }
      const hashed = await bcrypt.hash(password, 10);
      updates.push("password=?");
      params.push(hashed);
    }

    if (!updates.length) {
      return res.status(400).json({ success: false, message: "No valid fields to update" });
    }

    params.push(targetId);
    await pool.query(`UPDATE users SET ${updates.join(", ")} WHERE id=?`, params);

    const [updated] = await pool.query(
      `SELECT u.id, u.name, u.email, u.short_form, u.created_at, r.name AS role_name
       FROM users u
       LEFT JOIN roles r ON u.role_id = r.id
       WHERE u.id=?`,
      [targetId]
    );

    res.json({ success: true, data: updated[0]});
  } catch (err) {
    console.error("updateUser error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
}

/** DELETE /api/users/:id — delete user (super-admin only) */
export async function deleteUser(req, res) {
  try {
    const id = Number(req.params.id);
    const actorId = req.user?.id;

    if (!hasRole(req, "super-admin")) {
      return res.status(403).json({ success: false, message: "Only super-admin can delete users" });
    }

    if (id === actorId) {
      return res.status(400).json({ success: false, message: "You cannot delete your own account" });
    }

    // Prevent deleting last super-admin
    const [[target]] = await pool.query(
      `SELECT u.id, r.name AS role_name
       FROM users u
       LEFT JOIN roles r ON u.role_id = r.id
       WHERE u.id=?`,
      [id]
    );
    if (!target) return res.status(404).json({ success: false, message: "User not found" });

    if (target.role_name === "super-admin") {
      const [[row]] = await pool.query(
        "SELECT COUNT(*) AS cnt FROM users u JOIN roles r ON u.role_id = r.id WHERE r.name='super-admin'"
      );
      if (Number(row.cnt) <= 1) {
        return res.status(400).json({ success: false, message: "Cannot delete the last super-admin" });
      }
    }

    await pool.query("DELETE FROM users WHERE id=?", [id]);
    res.json({ success: true, message: "User deleted successfully" });
  } catch (err) {
    console.error("deleteUser error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
}

/** POST /api/users/logout — clear JWT token */
export async function logout(req, res) {
  try {
    if (req.user?.id) {
      await pool.query("UPDATE users SET token=NULL WHERE id=?", [req.user.id]);
    }
    res.json({ success: true, message: "Logged out" });
  } catch (err) {
    console.error("logout error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
}
