import bcrypt from "bcrypt";
import { pool } from "../lib/dbconnect-mysql.js";
// import { cookieOpts } from "../utils/authMiddleware.js";

function normalizeRoles(input) {
  if (input === undefined) return undefined; // means "don't change roles"

  const ALLOWED = new Set(["user", "sales-person", "admin", "super-admin"]);

  const arr = Array.isArray(input)
    ? input
    : String(input || "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

  if (arr.length > 0 && out.length === 0) {
    throw new Error("No valid roles provided");
  }

  // Lowercase + dedupe + keep only allowed (no aliasing)
  const out = [];
  for (const r of arr) {
    const v = String(r).trim().toLowerCase();
    if (ALLOWED.has(v) && !out.includes(v)) out.push(v);
  }
  return out;
}

function hasRole(roles, r) {
  return Array.isArray(roles) && roles.includes(r);
}

/** GET /api/users  (admin/super-admin) */
export async function listUsers(req, res) {
  try {
    const q = (req.query.q || "").trim();
    const limit = Math.min(parseInt(req.query.limit || "50", 10), 200);
    const page = Math.max(parseInt(req.query.page || "1", 10), 1);
    const offset = (page - 1) * limit;

    let where = "";
    let params = [];
    if (q) {
      where = "WHERE (name LIKE ? OR email LIKE ? OR short_form LIKE ?)";
      const like = `%${q}%`;
      params = [like, like, like];
    }

    const [rows] = await pool.query(
      `SELECT id, name, email, short_form, role, created_at
       FROM users
       ${where}
       ORDER BY id DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    const [countRows] = await pool.query(
      `SELECT COUNT(*) AS total FROM users ${where}`,
      params
    );

    res.json({
      results: rows.map((u) => ({
        ...u,
        role: Array.isArray(u.role) ? u.role : JSON.parse(u.role || "[]"),
      })),
      page,
      limit,
      total: countRows[0].total,
      total_pages: Math.ceil(countRows[0].total / limit),
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

/** GET /api/users/:id  (admin/super-admin) */
export async function getUserById(req, res) {
  try {
    const id = Number(req.params.id);
    const [rows] = await pool.query(
      "SELECT id, name, email, short_form, role, created_at FROM users WHERE id=?",
      [id]
    );
    if (!rows.length)
      return res.status(404).json({ message: "User not found" });
    const u = rows[0];
    u.role = Array.isArray(u.role) ? u.role : JSON.parse(u.role || "[]");
    res.json(u);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

/** GET /api/users/me  (authenticated) */
export async function getMe(req, res) {
  try {
    const id = req.user?.id;
    const [rows] = await pool.query(
      "SELECT id, name, email, short_form, role, created_at FROM users WHERE id=?",
      [id]
    );
    if (!rows.length)
      return res.status(404).json({ message: "User not found" });
    const u = rows[0];
    u.role = Array.isArray(u.role) ? u.role : JSON.parse(u.role || "[]");
    res.json(u);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

/** PUT /api/users/:id  (admin or super-admin)
 *  - Only super-admin can modify roles
 *  - Prevent removing the last super-admin
 *  - Email is immutable
 */
export async function updateUser(req, res) {
  try {
    const targetId = Number(req.params.id);

    // Auth context (set by your authenticate middleware)
    const actorId = req.user?.id;
    const actorRoles = Array.isArray(req.user?.role)
      ? req.user.role
      : (() => {
          try {
            return JSON.parse(req.user?.role || "[]");
          } catch {
            return [];
          }
        })();

    const [[target]] = await pool.query(
      "SELECT id, name, email, short_form, role FROM users WHERE id=?",
      [targetId]
    );
    if (!target) return res.status(404).json({ message: "User not found" });

    // Current roles of target
    const targetRoles = (() => {
      try {
        return JSON.parse(target.role || "[]");
      } catch {
        return [];
      }
    })();

    // Extract body (email immutable)
    let { name, short_form, password, role /* email ignored intentionally */ } =
      req.body || {};

    // Prepare updates
    const updates = [];
    const params = [];

    if (name !== undefined) {
      name = String(name).trim();
      if (!name)
        return res.status(400).json({ message: "name cannot be empty" });
      updates.push("name=?");
      params.push(name);
    }

    if (short_form !== undefined) {
      short_form = String(short_form).trim();
      if (!short_form)
        return res.status(400).json({ message: "short_form cannot be empty" });
      updates.push("short_form=?");
      params.push(short_form);
    }

    // --- ROLE CHANGES (guarded) ---
    if (requestedRoles !== undefined && actorId === targetId) {
      return res
        .status(403)
        .json({ message: "You cannot change your own role" });
    }

    const requestedRoles = normalizeRoles(role);
    if (requestedRoles !== undefined) {
      // Rule 1: only super-admin can change roles
      if (!hasRole(actorRoles, "super-admin")) {
        return res
          .status(403)
          .json({ message: "Only super-admin can change roles" });
      }

      // Rule 2: prevent removing the last super-admin
      const targetWasSuperAdmin = hasRole(targetRoles, "super-admin");
      const targetWillBeSuperAdmin = hasRole(requestedRoles, "super-admin");

      if (targetWasSuperAdmin && !targetWillBeSuperAdmin) {
        // count current super-admins
        const [[row]] = await pool.query(
          `SELECT COUNT(*) AS cnt
             FROM users
            WHERE JSON_CONTAINS(role, JSON_QUOTE('super-admin'))`
        );
        const superCount = Number(row?.cnt || 0);
        if (superCount <= 1) {
          return res.status(400).json({
            message: "Cannot remove role: this is the last super-admin",
          });
        }
      }

      updates.push("role=?");
      params.push(JSON.stringify(requestedRoles));
    }

    if (password !== undefined) {
      password = String(password);
      if (password.length < 8) {
        return res
          .status(400)
          .json({ message: "Password must be at least 8 characters" });
      }
      const hashed = await bcrypt.hash(password, 10);
      updates.push("password=?");
      params.push(hashed);
    }

    if (!updates.length) {
      return res.status(400).json({ message: "No valid fields to update" });
    }

    params.push(targetId);
    await pool.query(
      `UPDATE users SET ${updates.join(", ")} WHERE id=?`,
      params
    );

    const [rows] = await pool.query(
      "SELECT id, name, email, short_form, role, created_at FROM users WHERE id=?",
      [targetId]
    );
    const u = rows[0];
    try {
      u.role = Array.isArray(u.role) ? u.role : JSON.parse(u.role || "[]");
    } catch {
      u.role = [];
    }

    return res.json(u);
  } catch (err) {
    if (err.code === "ER_DUP_ENTRY") {
      return res
        .status(409)
        .json({ message: "Duplicate value (probably short_form)" });
    }
    return res.status(500).json({ message: err.message });
  }
}

/** DELETE /api/users/:id  (admin/super-admin) */
export async function deleteUser(req, res) {
  try {
    const id = Number(req.params.id);
    if (req.user?.id === id) {
      return res
        .status(400)
        .json({ message: "You cannot delete your own account" });
    }

    const [r] = await pool.query(
      "UPDATE users SET is_active=0, deactivated_at=NOW() WHERE id=?",
      [id]
    );
    if (r.affectedRows === 0)
      return res.status(404).json({ message: "User not found" });
    res.json({ message: "User deleted" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

/** POST /api/users/logout  (authenticated) – optional */
export async function logout(req, res) {
  try {
    if (req.user?.id) {
      await pool.query("UPDATE users SET token=NULL WHERE id=?", [req.user.id]);
    }
    // Clear the cookie using the SAME attributes you set it with
    // res.clearCookie("access_token", {
    //   httpOnly: cookieOpts.httpOnly,
    //   secure: cookieOpts.secure,
    //   sameSite: cookieOpts.sameSite,
    //   path: cookieOpts.path,
    //   // domain: cookieOpts.domain, // only if you set it originally
    // });
    return res.json({ success: true, message: "Logged out" });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}
