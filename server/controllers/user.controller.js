import bcrypt from "bcrypt";
import { pool } from "../lib/dbconnect-mysql.js";
import { safeParseRoles } from "../utils/role.js";

/** Helper: check if the authenticated user has a given role */
function hasRole(req, roleName) {
  return Array.isArray(req.user?.roles) && req.user.roles.includes(roleName);
}

/** GET /api/users — list all users (admin/super-admin only) */
export async function listUsers(req, res) {
  try {
    if (!hasRole(req, "admin") && !hasRole(req, "super-admin")) {
      return res.status(403).json({ success: false, message: "Forbidden" });
    }

    const q = (req.query.q || "").trim();
    const role = req.query.role || "all";
    const user_type = req.query.user_type || "all";
    const is_active = req.query.is_active ?? "true";

    const limit = Math.min(parseInt(req.query.limit || "50", 10), 200);
    const page = Math.max(parseInt(req.query.page || "1", 10), 1);
    const offset = (page - 1) * limit;

    let where = "WHERE 1=1";
    const params = [];

    if (q) {
      where = "WHERE (u.name LIKE ? OR u.email LIKE ? OR u.short_form LIKE ?)";
      const like = `%${q}%`;
      params.push(like, like, like);
    }

    if (is_active !== "all") {
      where += " AND u.is_active = ?";
      params.push(is_active === "true");
    }

    if (role !== "all") {
      where += " AND r.name = ?";
      params.push(role);
    }

    if (user_type !== "all") {
      where += " AND u.user_type = ?";
      params.push(user_type);
    }

    const [rows] = await pool.query(
      `SELECT 
          u.id, u.name, u.email, u.short_form, u.user_type,
          u.is_active, u.created_at,
          JSON_ARRAYAGG(r.name) AS roles
       FROM users u
       LEFT JOIN user_roles ur ON ur.user_id = u.id
       LEFT JOIN roles r ON r.id = ur.role_id
       ${where}
       GROUP BY u.id
       ORDER BY u.id DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    const [[{ total }]] = await pool.query(
      `SELECT COUNT(*) AS total
       FROM users u
       LEFT JOIN user_roles ur ON ur.user_id = u.id
       LEFT JOIN roles r ON r.id = ur.role_id
       ${where}`,
      params
    );

    res.json({
      success: true,
      data: rows.map((u) => ({
        ...u,
        roles: safeParseRoles(u.roles || "[]"),
      })),
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
      return res.status(403).json({ message: "Forbidden" });
    }

    const id = Number(req.params.id);
    const [rows] = await pool.query(
      `SELECT u.id, u.name, u.email, u.short_form, u.created_at, 
              JSON_ARRAYAGG(r.name) AS roles
       FROM users u
       LEFT JOIN user_roles ur ON ur.user_id = u.id
       LEFT JOIN roles r ON r.id = ur.role_id
       WHERE u.id = ?
       GROUP BY u.id`,
      [id]
    );

    if (!rows.length)
      return res.status(404).json({ message: "User not found" });

    const user = rows[0];
    user.roles = safeParseRoles(user.roles || "[]");

    res.json({ success: true, data: user });
  } catch (err) {
    console.error("getUser error:", err);
    res.status(500).json({ message: err.message });
  }
}

/** GET /api/users/me — get own profile (authenticated) */
export async function getMe(req, res) {
  try {
    const id = req.user?.id;
    if (!id) return res.status(401).json({ message: "Not authenticated" });

    const [rows] = await pool.query(
      `SELECT u.id, u.name, u.email, u.short_form, u.created_at,
              JSON_ARRAYAGG(r.name) AS roles
       FROM users u
       LEFT JOIN user_roles ur ON ur.user_id = u.id
       LEFT JOIN roles r ON r.id = ur.role_id
       WHERE u.id = ?
       GROUP BY u.id`,
      [id]
    );

    if (!rows.length)
      return res.status(404).json({ message: "User not found" });

    const user = rows[0];
    user.roles = safeParseRoles(user.roles || "[]");

    res.json({ success: true, data: user });
  } catch (err) {
    console.error("getMe error:", err);
    res.status(500).json({ message: err.message });
  }
}

/** PUT /api/users/:id — update user (super-admin only for roles, admin for info) */
export async function updateUser(req, res) {
  try {
    const targetId = Number(req.params.id);
    const actorId = req.user?.id;

    const isSuper = req.user.roles?.includes("super-admin");
    const isAdmin = req.user.roles?.includes("admin");

    // Normal users can only edit their own profile
    if (!isSuper && !isAdmin && actorId !== targetId) {
      return res.status(403).json({
        success: false,
        message: "Forbidden: insufficient permissions",
      });
    }

    // Fetch existing user
    const [[target]] = await pool.query(
      `SELECT u.*, JSON_ARRAYAGG(r.name) AS roles
       FROM users u
       LEFT JOIN user_roles ur ON ur.user_id = u.id
       LEFT JOIN roles r ON r.id = ur.role_id
       WHERE u.id = ?
       GROUP BY u.id`,
      [targetId]
    );

    if (!target) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    let { name, email, short_form, password, roles, user_type } =
      req.body || {};

    const updates = [];
    const params = [];

    // -------------------------------
    // NAME
    // -------------------------------
    if (name !== undefined) {
      name = String(name).trim();
      if (!name)
        return res
          .status(400)
          .json({ success: false, message: "Name cannot be empty" });

      updates.push("name=?");
      params.push(name);
    }

    // -------------------------------
    // SHORT FORM
    // -------------------------------
    if (short_form !== undefined) {
      short_form = String(short_form).trim();
      if (!short_form)
        return res
          .status(400)
          .json({ success: false, message: "Short form cannot be empty" });

      updates.push("short_form=?");
      params.push(short_form);
    }

    // -------------------------------
    // USER TYPE
    // -------------------------------
    if (user_type !== undefined) {
      if (!["system_user", "sales_person"].includes(user_type)) {
        return res
          .status(400)
          .json({ success: false, message: "Invalid user_type" });
      }

      updates.push("user_type=?");
      params.push(user_type);

      // sales_person → system_user must have email
      if (target.user_type === "sales_person" && user_type === "system_user") {
        if (!email) {
          return res.status(400).json({
            success: false,
            message: "Email required when converting to system_user",
          });
        }
      }

      // system_user → sales_person clears password
      if (target.user_type === "system_user" && user_type === "sales_person") {
        updates.push("password=NULL");
      }
    }

    // -------------------------------
    // EMAIL
    // -------------------------------
    if (email !== undefined) {
      email = email ? String(email).trim().toLowerCase() : null;

      const newType = user_type || target.user_type;

      if (newType === "system_user") {
        if (!isAdmin && !isSuper) {
          return res.status(403).json({
            success: false,
            message: "System users cannot change email",
          });
        }
        if (!email) {
          return res.status(400).json({
            success: false,
            message: "Email is required for system_user",
          });
        }
      }

      updates.push("email=?");
      params.push(email);
    }

    // -------------------------------
    // PASSWORD
    // -------------------------------
    if (password !== undefined) {
      const newType = user_type || target.user_type;

      if (newType === "sales_person") {
        return res.status(400).json({
          success: false,
          message: "Sales person cannot have password",
        });
      }

      if (password) {
        if (password.length < 8)
          return res
            .status(400)
            .json({ success: false, message: "Password too short" });

        const hashed = await bcrypt.hash(password, 10);
        updates.push("password=?");
        params.push(hashed);
      }
    }

    // -------------------------------
    // ROLES UPDATE
    // -------------------------------
    let rolesUpdated = false;

    if (roles !== undefined) {
      if (!isSuper) {
        return res.status(403).json({
          success: false,
          message: "Only super-admin can change roles",
        });
      }

      rolesUpdated = true;

      // Normalize to array
      if (!Array.isArray(roles)) roles = [roles];

      // Convert all role names → ids
      const [roleRows] = await pool.query(
        "SELECT id, name FROM roles WHERE name IN (?)",
        [roles]
      );

      if (roleRows.length !== roles.length) {
        return res.status(400).json({
          success: false,
          message: "One or more invalid role names",
        });
      }

      const roleIds = roleRows.map((r) => r.id);

      // Clear existing roles
      await pool.query("DELETE FROM user_roles WHERE user_id=?", [targetId]);

      // Insert new roles
      const values = roleIds.map((id) => [targetId, id]);
      await pool.query("INSERT INTO user_roles (user_id, role_id) VALUES ?", [
        values,
      ]);
    }

    // -------------------------------
    // RUN SQL UPDATE ONLY IF NEEDED
    // -------------------------------
    if (updates.length > 0) {
      params.push(targetId);
      await pool.query(
        `UPDATE users SET ${updates.join(", ")} WHERE id=?`,
        params
      );
    }

    if (!updates.length && !rolesUpdated) {
      return res
        .status(400)
        .json({ success: false, message: "No updates provided" });
    }

    // -------------------------------
    // RETURN UPDATED USER
    // -------------------------------
    return getUserById({ params: { id: targetId }, user: req.user }, res);
  } catch (err) {
    console.error("updateUser error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
}

/** DELETE /api/users/:id — delete user (super-admin only) */
export async function deleteUser(req, res) {
  try {
    const id = Number(req.params.id);

    if (!hasRole(req, "super-admin")) {
      return res.status(403).json({ message: "Only super-admin allowed" });
    }

    // Find roles of this user
    const [[user]] = await pool.query(
      `SELECT u.is_active, JSON_ARRAYAGG(r.name) AS roles
       FROM users u
       LEFT JOIN user_roles ur ON ur.user_id = u.id
       LEFT JOIN roles r ON r.id = ur.role_id
       WHERE u.id=?
       GROUP BY u.id`,
      [id]
    );

    if (!user) return res.status(404).json({ message: "User not found" });

    const roles = JSON.parse(user.roles || "[]");

    if (roles.includes("super-admin")) {
      const [[countRow]] = await pool.query(
        `SELECT COUNT(*) AS cnt
         FROM users u
         JOIN user_roles ur ON ur.user_id = u.id
         JOIN roles r ON r.id = ur.role_id
         WHERE r.name='super-admin' AND u.is_active=TRUE`
      );
      if (countRow.cnt <= 1)
        return res.status(400).json({
          message: "Cannot deactivate last active super-admin",
        });
    }

    await pool.query(
      `UPDATE users SET is_active=FALSE, deactivated_at=NOW() WHERE id=?`,
      [id]
    );

    res.json({ success: true, message: "User deactivated" });
  } catch (err) {
    console.error("deleteUser error:", err);
    res.status(500).json({ message: err.message });
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
