import bcrypt from "bcrypt";
import { pool } from "../lib/dbconnect-mysql.js";
// import { cookieOpts } from "../utils/authMiddleware.js";

function normalizeRoles(role) {
  if (Array.isArray(role))
    return [...new Set(role.map((r) => String(r).trim()).filter(Boolean))];
  if (role == null) return null;
  return [
    ...new Set(
      String(role)
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
    ),
  ];
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

/** PUT /api/users/:id  (admin/super-admin)
 *  Fields: name, short_form, password, role (array)
 */
export async function updateUser(req, res) {
  try {
    const id = Number(req.params.id);
    const [exists] = await pool.query("SELECT * FROM users WHERE id=?", [id]);
    if (!exists.length)
      return res.status(404).json({ message: "User not found" });

    const { name, email, short_form, password, role } = req.body;

    // Build dynamic update
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
    const roles = normalizeRoles(role);
    if (roles) {
      // Optional: restrict to known roles
      const ALLOWED = new Set([
        "user",
        "salesperson",
        "admin",
        "super-admin",
        "sales-person",
      ]);
      const cleaned = roles.filter((r) => ALLOWED.has(r));
      updates.push("role=?");
      params.push(JSON.stringify(cleaned));
    }
    if (password !== undefined) {
      if (String(password).length < 8) {
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

    params.push(id);
    await pool.query(
      `UPDATE users SET ${updates.join(", ")} WHERE id=?`,
      params
    );

    const [rows] = await pool.query(
      "SELECT id, name, email, short_form, role, created_at FROM users WHERE id=?",
      [id]
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
      // Only short_form could realistically collide now
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

    const [rows] = await pool.query("SELECT id FROM users WHERE id=?", [id]);
    if (!rows.length)
      return res.status(404).json({ message: "User not found" });

    await pool.query("DELETE FROM users WHERE id=?", [id]);
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
