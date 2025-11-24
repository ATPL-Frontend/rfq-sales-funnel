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
      return res.status(403).json({
        success: false,
        message: "Forbidden: insufficient permissions",
      });
    }

    const q = (req.query.q || "").trim();
    // 🧩 Filters
    const role = req.query.role || "all"; // default → all roles
    const user_type = req.query.user_type || "all"; // default → all user types
    const is_active = req.query.is_active ?? "true"; // default → ONLY active users

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
          r.name AS role_name
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
       LEFT JOIN roles r ON u.role_id = r.id
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
      return res.status(403).json({
        success: false,
        message: "Forbidden: insufficient permissions",
      });
    }

    const id = Number(req.params.id);
    const [rows] = await pool.query(
      `SELECT u.id, u.name, u.email, u.short_form, u.created_at, r.name AS role_name
       FROM users u
       LEFT JOIN roles r ON u.role_id = r.id
       WHERE u.id = ?`,
      [id]
    );

    if (!rows.length)
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    console.error("getUserById error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
}

/** GET /api/users/me — get own profile (authenticated) */
export async function getMe(req, res) {
  try {
    const id = req.user?.id;
    if (!id)
      return res
        .status(401)
        .json({ success: false, message: "Not authenticated" });

    const [rows] = await pool.query(
      `SELECT u.id, u.name, u.email, u.short_form, u.created_at, r.name AS role_name
       FROM users u
       LEFT JOIN roles r ON u.role_id = r.id
       WHERE u.id = ?`,
      [id]
    );

    if (!rows.length)
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    res.json({ success: true, data: rows[0] });
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

    // Normal users can only edit their own profile
    if (!isSuper && !isAdmin && actorId !== targetId) {
      return res.status(403).json({
        success: false,
        message: "Forbidden: insufficient permissions",
      });
    }

    // Fetch existing user
    const [[target]] = await pool.query(
      `SELECT u.*, r.name AS role_name 
       FROM users u
       LEFT JOIN roles r ON u.role_id = r.id
       WHERE u.id = ?`,
      [targetId]
    );

    if (!target) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    // Extract fields (FIXED: email included)
    let { name, email, short_form, password, role, user_type } = req.body || {};

    const updates = [];
    const params = [];

    // -------------------------------
    // BASIC UPDATES
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
    // USER TYPE UPDATE
    // -------------------------------
    if (user_type !== undefined) {
      if (!["system_user", "sales_person"].includes(user_type)) {
        return res
          .status(400)
          .json({ success: false, message: "Invalid user_type" });
      }

      updates.push("user_type=?");
      params.push(user_type);

      // Convert sales_person → system_user requires email
      if (target.user_type === "sales_person" && user_type === "system_user") {
        if (!email) {
          return res.status(400).json({
            success: false,
            message: "Email is required when converting to system_user",
          });
        }
      }

      // Convert system_user → sales_person → remove password
      if (target.user_type === "system_user" && user_type === "sales_person") {
        updates.push("password=NULL");
      }
    }

    // -------------------------------
    // EMAIL UPDATE
    // -------------------------------
    if (email !== undefined) {
      email = email ? String(email).trim().toLowerCase() : null;

      const finalType = user_type || target.user_type;

      // ---------- SYSTEM USER ----------
      if (finalType === "system_user") {
        // system user cannot change own email
        if (!isAdmin && !isSuper) {
          return res.status(403).json({
            success: false,
            message: "System users cannot change their email",
          });
        }

        // email must exist
        if (!email) {
          return res.status(400).json({
            success: false,
            message: "Email is required for system_user",
          });
        }
      }

      // ---------- SALES PERSON ----------
      if (finalType === "sales_person") {
        // if no email existed, allow first-time setup
        if (target.email === null) {
          // first time email assignment is allowed
          // (no extra rules)
        } else {
          // cannot change if email already exists
          if (!isAdmin && !isSuper) {
            return res.status(403).json({
              success: false,
              message: "Sales person cannot change email once assigned",
            });
          }
        }
      }

      // Apply email update
      updates.push("email=?");
      params.push(email);
    }

    // -------------------------------
    // ROLE UPDATE (super-admin only)
    // -------------------------------
    if (role !== undefined) {
      if (!isSuper) {
        return res.status(403).json({
          success: false,
          message: "Only super-admin can change roles",
        });
      }

      const [roleRows] = await pool.query("SELECT id FROM roles WHERE name=?", [
        role,
      ]);

      if (!roleRows.length) {
        return res
          .status(400)
          .json({ success: false, message: `Invalid role: ${role}` });
      }

      updates.push("role_id=?");
      params.push(roleRows[0].id);
    }

    // -------------------------------
    // PASSWORD UPDATE
    // -------------------------------
    if (password !== undefined) {
      const finalType = user_type || target.user_type;

      if (finalType === "sales_person") {
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

    // No updates?
    if (!updates.length) {
      return res
        .status(400)
        .json({ success: false, message: "No updates provided" });
    }

    // Execute update
    params.push(targetId);
    await pool.query(
      `UPDATE users SET ${updates.join(", ")} WHERE id=?`,
      params
    );

    // Return updated user
    const [updated] = await pool.query(
      `SELECT u.id, u.name, u.email, u.short_form, u.user_type,
              u.created_at, r.name AS role_name
       FROM users u
       LEFT JOIN roles r ON u.role_id = r.id
       WHERE u.id=?`,
      [targetId]
    );

    res.json({ success: true, data: updated[0] });
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
      return res.status(403).json({
        success: false,
        message: "Only super-admin can deactivate users",
      });
    }

    if (id === actorId) {
      return res.status(400).json({
        success: false,
        message: "You cannot deactivate your own account",
      });
    }

    // Fetch user & role
    const [[target]] = await pool.query(
      `SELECT u.id, u.is_active, r.name AS role_name
       FROM users u
       LEFT JOIN roles r ON u.role_id = r.id
       WHERE u.id=?`,
      [id]
    );

    if (!target) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    // Prevent deactivating last super-admin
    if (target.role_name === "super-admin") {
      const [[row]] = await pool.query(
        `SELECT COUNT(*) AS cnt
         FROM users u
         JOIN roles r ON u.role_id = r.id
         WHERE r.name='super-admin' AND u.is_active=TRUE`
      );

      if (Number(row.cnt) <= 1) {
        return res.status(400).json({
          success: false,
          message: "Cannot deactivate the last active super-admin",
        });
      }
    }

    // If already inactive → no need to update
    if (!target.is_active) {
      return res.json({
        success: true,
        message: "User is already deactivated",
      });
    }

    // SOFT DELETE (deactivate user)
    await pool.query(
      `UPDATE users
       SET is_active = FALSE,
           deactivated_at = NOW()
       WHERE id = ?`,
      [id]
    );

    res.json({
      success: true,
      message: "User deactivated successfully",
    });
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
