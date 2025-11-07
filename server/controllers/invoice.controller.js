import { pool } from "../lib/dbconnect-mysql.js";
import ac from "../utils/roles.js";

const CURRENCIES = ["AUD", "USD"];

/**
 * Helper to check AccessControl permission
 * @param {string[]} roles - user roles
 * @param {string} action - e.g. "createAny"
 * @param {string} resource - e.g. "invoice"
 */
function checkPermission(roles, action, resource) {
  for (const role of roles) {
    const permission = ac.can(role)[action](resource);
    if (permission.granted) return true;
  }
  return false;
}

/** CREATE */
export async function createInvoice(req, res) {
  try {
    const roles = Array.isArray(req.user?.role)
      ? req.user.role
      : [req.user?.role || "user"];

    if (!checkPermission(roles, "createAny", "invoice")) {
      return res.status(403).json({ message: "Forbidden: insufficient permissions" });
    }

    let { invoice_date, customer_id, amount, currency } = req.body || {};

    invoice_date = String(invoice_date || "").trim();
    customer_id = Number(customer_id);
    amount = Number(amount);
    currency = String(currency || "").trim().toUpperCase();

    if (!invoice_date || !customer_id || !amount || !currency) {
      return res
        .status(400)
        .json({
          message: "invoice_date, customer_id, amount, currency are required",
        });
    }

    if (!CURRENCIES.includes(currency)) {
      return res.status(400).json({ message: "currency must be AUD or USD" });
    }
    if (!(amount > 0)) {
      return res.status(400).json({ message: "amount must be greater than 0" });
    }

    const [[cust]] = await pool.query(
      "SELECT id, name FROM customers WHERE id=?",
      [customer_id]
    );
    if (!cust)
      return res
        .status(400)
        .json({ message: `Customer ${customer_id} not found` });

    const [r] = await pool.query(
      `INSERT INTO invoices (invoice_date, customer_id, amount, currency)
       VALUES (?, ?, ?, ?)`,
      [invoice_date, customer_id, amount, currency]
    );

    const [rows] = await pool.query(
      `SELECT i.*, c.name AS customer_name, c.email AS customer_email, c.code AS customer_code
       FROM invoices i
       JOIN customers c ON c.id = i.customer_id
       WHERE i.id = ?`,
      [r.insertId]
    );

    res.status(201).json(rows[0]);
  } catch (err) {
    if (err.code === "ER_NO_REFERENCED_ROW_2") {
      return res.status(400).json({ message: "Invalid foreign key (customer)" });
    }
    res.status(500).json({ message: err.message });
  }
}

/** READ: list with optional filters */
export async function listInvoices(req, res) {
  try {
    const roles = Array.isArray(req.user?.role)
      ? req.user.role
      : [req.user?.role || "user"];

    if (
      !checkPermission(roles, "readAny", "invoice") &&
      !checkPermission(roles, "readOwn", "invoice")
    ) {
      return res.status(403).json({ message: "Forbidden: insufficient permissions" });
    }

    const customer_id = req.query.customer_id
      ? Number(req.query.customer_id)
      : null;
    const currency = (req.query.currency || "").trim().toUpperCase();
    const date_from = (req.query.date_from || "").trim();
    const date_to = (req.query.date_to || "").trim();
    const q = (req.query.q || "").trim();

    const limit = Math.min(Math.max(parseInt(req.query.limit || "50", 10), 1), 200);
    const page = Math.max(parseInt(req.query.page || "1", 10), 1);
    const offset = (page - 1) * limit;

    const where = [];
    const params = [];

    if (customer_id) {
      where.push("i.customer_id = ?");
      params.push(customer_id);
    }
    if (currency) {
      where.push("i.currency = ?");
      params.push(currency);
    }
    if (date_from) {
      where.push("i.invoice_date >= ?");
      params.push(date_from);
    }
    if (date_to) {
      where.push("i.invoice_date <= ?");
      params.push(date_to);
    }
    if (q) {
      where.push("(c.name LIKE ? OR c.email LIKE ?)");
      params.push(`%${q}%`, `%${q}%`);
    }

    const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

    const sql = `
      SELECT i.*, c.name AS customer_name, c.email AS customer_email, c.code AS customer_code
      FROM invoices i
      JOIN customers c ON c.id = i.customer_id
      ${whereSql}
      ORDER BY i.invoice_date DESC, i.id DESC
      LIMIT ${limit} OFFSET ${offset}
    `;
    const [rows] = await pool.query(sql, params);

    const [[{ total }]] = await pool.query(
      `SELECT COUNT(*) AS total
       FROM invoices i
       JOIN customers c ON c.id = i.customer_id
       ${whereSql}`,
      params
    );

    res.json({
      results: rows,
      page,
      limit,
      total,
      total_pages: Math.ceil(total / limit),
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

/** READ: one */
export async function getInvoiceById(req, res) {
  try {
    const roles = Array.isArray(req.user?.role)
      ? req.user.role
      : [req.user?.role || "user"];

    if (
      !checkPermission(roles, "readAny", "invoice") &&
      !checkPermission(roles, "readOwn", "invoice")
    ) {
      return res.status(403).json({ message: "Forbidden: insufficient permissions" });
    }

    const id = Number(req.params.id);
    const [rows] = await pool.query(
      `SELECT i.*, c.name AS customer_name, c.email AS customer_email, c.code AS customer_code
       FROM invoices i
       JOIN customers c ON c.id = i.customer_id
       WHERE i.id = ?`,
      [id]
    );
    if (!rows.length)
      return res.status(404).json({ message: "Invoice not found" });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

/** UPDATE */
export async function updateInvoice(req, res) {
  try {
    const roles = Array.isArray(req.user?.role)
      ? req.user.role
      : [req.user?.role || "user"];

    if (!checkPermission(roles, "updateAny", "invoice")) {
      return res.status(403).json({ message: "Forbidden: insufficient permissions" });
    }

    const id = Number(req.params.id);
    const [exist] = await pool.query("SELECT * FROM invoices WHERE id=?", [id]);
    if (!exist.length)
      return res.status(404).json({ message: "Invoice not found" });

    const allowed = ["invoice_date", "customer_id", "amount", "currency"];
    const updates = [];
    const params = [];

    for (const key of allowed) {
      if (!(key in req.body)) continue;

      if (key === "currency") {
        const v = String(req.body.currency || "").trim().toUpperCase();
        if (!CURRENCIES.includes(v))
          return res.status(400).json({ message: "Currency must be AUD or USD" });
        updates.push("currency = ?");
        params.push(v);
        continue;
      }
      if (key === "amount") {
        const amt = Number(req.body.amount);
        if (!(amt > 0))
          return res.status(400).json({ message: "Amount must be greater than 0" });
        updates.push("amount = ?");
        params.push(amt);
        continue;
      }
      if (key === "customer_id") {
        const cid = Number(req.body.customer_id);
        if (!cid)
          return res.status(400).json({ message: "customer_id invalid" });
        const [[cust]] = await pool.query("SELECT id FROM customers WHERE id=?", [cid]);
        if (!cust)
          return res.status(400).json({ message: `Customer ${cid} not found` });
        updates.push("customer_id = ?");
        params.push(cid);
        continue;
      }
      if (key === "invoice_date") {
        const d = String(req.body.invoice_date || "").trim();
        if (!d)
          return res.status(400).json({ message: "invoice_date invalid" });
        updates.push("invoice_date = ?");
        params.push(d);
        continue;
      }
    }

    if (!updates.length)
      return res.status(400).json({ message: "No valid fields to update" });

    params.push(id);
    await pool.query(
      `UPDATE invoices
       SET ${updates.join(", ")}, updated_at = NOW()
       WHERE id = ?`,
      params
    );

    return await getInvoiceById(req, res);
  } catch (err) {
    if (err.code === "ER_NO_REFERENCED_ROW_2") {
      return res.status(400).json({ message: "Invalid foreign key (customer)" });
    }
    res.status(500).json({ message: err.message });
  }
}

/** DELETE */
export async function deleteInvoice(req, res) {
  try {
    const roles = Array.isArray(req.user?.role)
      ? req.user.role
      : [req.user?.role || "user"];

    if (!checkPermission(roles, "deleteAny", "invoice")) {
      return res.status(403).json({ message: "Forbidden: insufficient permissions" });
    }

    const id = Number(req.params.id);
    const [r] = await pool.query("DELETE FROM invoices WHERE id=?", [id]);
    if (r.affectedRows === 0)
      return res.status(404).json({ message: "Invoice not found" });

    res.json({ success: true, message: "Invoice deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}
