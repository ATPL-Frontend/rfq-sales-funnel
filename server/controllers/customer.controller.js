import { pool } from "../lib/dbconnect-mysql.js";
import ac from "../utils/roles.js";

/**
 * Helper to check permission using AccessControl
 * @param {string[]} roles - user roles from req.user.role
 * @param {string} action - e.g., "createAny", "readOwn"
 * @param {string} resource - e.g., "customer"
 */
function checkPermission(roles, action, resource) {
  for (const role of roles) {
    const permission = ac.can(role)[action](resource);
    if (permission.granted) return true;
  }
  return false;
}

/** CREATE */
export async function createCustomer(req, res) {
  try {
    const roles = Array.isArray(req.user?.role)
      ? req.user.role
      : [req.user?.role || "user"];

    if (!checkPermission(roles, "createAny", "customer")) {
      return res.status(403).json({ message: "Forbidden: insufficient permissions" });
    }

    let { name, email, code = null } = req.body || {};
    name = String(name || "").trim();
    email = String(email || "").trim().toLowerCase();
    code = code == null ? null : String(code).trim();

    if (!name || !email) {
      return res
        .status(400)
        .json({ success: false, message: "name and email are required" });
    }

    const [r] = await pool.query(
      "INSERT INTO customers (name, email, code) VALUES (?, ?, ?)",
      [name, email, code]
    );
    const [rows] = await pool.query("SELECT * FROM customers WHERE id=?", [r.insertId]);
    return res.status(201).json({ success: true, data: rows[0] });
  } catch (err) {
    if (err.code === "ER_DUP_ENTRY") {
      const msg = (err.sqlMessage || "").toLowerCase();
      if (msg.includes("uniq_customer_name")) {
        return res.status(409).json({
          success: false,
          field: "name",
          message: "Customer name already exists",
        });
      }
      if (msg.includes("uniq_customer_email")) {
        return res.status(409).json({
          success: false,
          field: "email",
          message: "Email already exists",
        });
      }
      return res.status(409).json({ success: false, message: "Duplicate entry" });
    }
    return res.status(500).json({ success: false, message: err.message });
  }
}

/** READ: list with optional search + pagination */
export async function listCustomers(req, res) {
  try {
    const roles = Array.isArray(req.user?.role)
      ? req.user.role
      : [req.user?.role || "user"];

    if (
      !checkPermission(roles, "readAny", "customer") &&
      !checkPermission(roles, "readOwn", "customer")
    ) {
      return res.status(403).json({ message: "Forbidden: insufficient permissions" });
    }

    const q = (req.query.q || "").trim();
    const limit = Math.min(parseInt(req.query.limit || "50", 10), 200);
    const page = Math.max(parseInt(req.query.page || "1", 10), 1);
    const offset = (page - 1) * limit;

    let rows, countRows;
    if (q) {
      const like = `%${q}%`;
      [rows] = await pool.query(
        `SELECT * FROM customers
         WHERE name LIKE ? OR email LIKE ? OR code LIKE ?
         ORDER BY name ASC
         LIMIT ? OFFSET ?`,
        [like, like, like, limit, offset]
      );
      [countRows] = await pool.query(
        `SELECT COUNT(*) as total
         FROM customers
         WHERE name LIKE ? OR email LIKE ? OR code LIKE ?`,
        [like, like, like]
      );
    } else {
      [rows] = await pool.query(
        `SELECT * FROM customers ORDER BY name ASC LIMIT ? OFFSET ?`,
        [limit, offset]
      );
      [countRows] = await pool.query(`SELECT COUNT(*) as total FROM customers`);
    }

    res.json({
      results: rows,
      page,
      limit,
      total: countRows[0].total,
      total_pages: Math.ceil(countRows[0].total / limit),
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

/** READ: one */
export async function getCustomerById(req, res) {
  try {
    const roles = Array.isArray(req.user?.role)
      ? req.user.role
      : [req.user?.role || "user"];

    if (
      !checkPermission(roles, "readAny", "customer") &&
      !checkPermission(roles, "readOwn", "customer")
    ) {
      return res.status(403).json({ message: "Forbidden: insufficient permissions" });
    }

    const id = Number(req.params.id);
    const [rows] = await pool.query("SELECT * FROM customers WHERE id=?", [id]);
    if (!rows.length)
      return res.status(404).json({ message: "Customer not found" });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

/** UPDATE */
export async function updateCustomer(req, res) {
  try {
    const roles = Array.isArray(req.user?.role)
      ? req.user.role
      : [req.user?.role || "user"];

    if (!checkPermission(roles, "updateAny", "customer")) {
      return res.status(403).json({ message: "Forbidden: insufficient permissions" });
    }

    const id = Number(req.params.id);
    const [exists] = await pool.query("SELECT * FROM customers WHERE id=?", [id]);
    if (!exists.length)
      return res.status(404).json({ success: false, message: "Customer not found" });

    let { name, email, code } = req.body || {};
    if (name !== undefined) name = String(name).trim();
    if (email !== undefined) email = String(email).trim().toLowerCase();
    if (code !== undefined) code = code == null ? null : String(code).trim();

    const updates = [];
    const params = [];
    if (name !== undefined) {
      updates.push("name=?");
      params.push(name);
    }
    if (email !== undefined) {
      updates.push("email=?");
      params.push(email);
    }
    if (code !== undefined) {
      updates.push("code=?");
      params.push(code);
    }

    if (!updates.length) {
      return res
        .status(400)
        .json({ success: false, message: "No valid fields to update" });
    }

    params.push(id);
    await pool.query(`UPDATE customers SET ${updates.join(", ")} WHERE id=?`, params);

    const [rows] = await pool.query("SELECT * FROM customers WHERE id=?", [id]);
    return res.json({ success: true, data: rows[0] });
  } catch (err) {
    if (err.code === "ER_DUP_ENTRY") {
      const msg = (err.sqlMessage || "").toLowerCase();
      if (msg.includes("uniq_customer_name")) {
        return res.status(409).json({
          success: false,
          field: "name",
          message: "Customer name already exists",
        });
      }
      if (msg.includes("uniq_customer_email")) {
        return res.status(409).json({
          success: false,
          field: "email",
          message: "Email already exists",
        });
      }
      return res.status(409).json({ success: false, message: "Duplicate entry" });
    }
    return res.status(500).json({ success: false, message: err.message });
  }
}

/** DELETE */
export async function deleteCustomer(req, res) {
  try {
    const roles = Array.isArray(req.user?.role)
      ? req.user.role
      : [req.user?.role || "user"];

    if (!checkPermission(roles, "deleteAny", "customer")) {
      return res.status(403).json({ message: "Forbidden: insufficient permissions" });
    }

    const id = Number(req.params.id);
    const [rows] = await pool.query("SELECT * FROM customers WHERE id=?", [id]);
    if (!rows.length)
      return res.status(404).json({ message: "Customer not found" });

    await pool.query("DELETE FROM customers WHERE id=?", [id]);
    res.json({ success: true, message: "Customer deleted" });
  } catch (err) {
    if (err.code === "ER_ROW_IS_REFERENCED_2") {
      return res
        .status(409)
        .json({ message: "Cannot delete: Customer is referenced by RFQs" });
    }
    res.status(500).json({ message: err.message });
  }
}
