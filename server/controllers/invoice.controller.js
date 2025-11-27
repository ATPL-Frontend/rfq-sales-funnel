import { pool } from "../lib/dbconnect-mysql.js";
import { hasPermission } from "../utils/role.js";

const CURRENCIES = ["AUD", "USD"];

/**
 * Helper to check AccessControl permission
 * @param {string[]} roles - user roles
 * @param {string} action - e.g. "createAny"
 * @param {string} resource - e.g. "invoice"
 */

/** CREATE */
export async function createInvoice(req, res) {
  try {
    const ok = hasPermission(req, "createAny", "invoice");

    if (!ok) {
      return res.status(403).json({
        success: false,
        message: "Forbidden: insufficient permissions",
      });
    }

    let { invoice_date, customer_id, invoice_no, amount, gst, currency } =
      req.body || {};

    invoice_date = String(invoice_date || "").trim();
    customer_id = Number(customer_id);
    invoice_no = String(invoice_no || "").trim();
    amount = Number(amount);
    gst = gst === undefined ? true : Boolean(gst);
    currency = String(currency || "")
      .trim()
      .toUpperCase();
    if (!invoice_date || !customer_id || !invoice_no || !amount || !currency) {
      return res.status(400).json({
        success: false,
        message:
          "invoice_date, customer_id, amount, currency, invoice_no are required",
      });
    }

    if (!CURRENCIES.includes(currency)) {
      return res
        .status(400)
        .json({ success: false, message: "currency must be AUD or USD" });
    }
    if (!(amount > 0)) {
      return res
        .status(400)
        .json({ success: false, message: "amount must be greater than 0" });
    }

    const [[cust]] = await pool.query(
      "SELECT id, name FROM customers WHERE id=?",
      [customer_id]
    );
    if (!cust)
      return res
        .status(400)
        .json({ success: false, message: `Customer ${customer_id} not found` });

    const [r] = await pool.query(
      `INSERT INTO invoices (invoice_date, customer_id, invoice_no, amount, gst, currency)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [invoice_date, customer_id, invoice_no, amount, gst, currency]
    );

    const [rows] = await pool.query(
      `SELECT i.*, c.name AS customer_name, c.email AS customer_email, c.code AS customer_code
       FROM invoices i
       JOIN customers c ON c.id = i.customer_id
       WHERE i.id = ?`,
      [r.insertId]
    );

    res
      .status(201)
      .json({ success: true, message: "Invoice created", data: rows[0] });
  } catch (err) {
    if (err.code === "ER_NO_REFERENCED_ROW_2") {
      return res
        .status(400)
        .json({ success: false, message: "Invalid foreign key (customer)" });
    }
    res.status(500).json({ success: false, message: err.message });
  }
}

/** READ: list with optional filters */
export async function listInvoices(req, res) {
  try {
    const ok = hasPermission(req, ["readAny", "readOwn"], "invoice");

    if (!ok) {
      return res.status(403).json({
        success: false,
        message: "Forbidden: insufficient permissions",
      });
    }

    const customer_id = req.query.customer_id
      ? Number(req.query.customer_id)
      : null;
    const invoice_no = (req.query.invoice_no || "").trim();
    const currency = (req.query.currency || "").trim().toUpperCase();
    const amount_from = req.query.amount_from
      ? Number(req.query.amount_from)
      : null;
    const amount_to = req.query.amount_to ? Number(req.query.amount_to) : null;
    const date_from = (req.query.date_from || "").trim();
    const date_to = (req.query.date_to || "").trim();
    const q = (req.query.q || "").trim();
    const rawSortField = (req.query.sort_field || "invoice_date").trim();
    const rawSortOrder = (req.query.sort_order || "desc").trim().toLowerCase();

    const allowedSortFields = {
      invoice_date: "i.invoice_date",
      amount: "i.amount",
    };

    const sortField =
      allowedSortFields[rawSortField] || allowedSortFields["invoice_date"];

    const sortOrder = rawSortOrder === "asc" ? "ASC" : "DESC";

    const limit = Math.min(
      Math.max(parseInt(req.query.limit || "50", 10), 1),
      200
    );
    const page = Math.max(parseInt(req.query.page || "1", 10), 1);
    const offset = (page - 1) * limit;

    const where = [];
    const params = [];

    if (customer_id) {
      where.push("i.customer_id = ?");
      params.push(customer_id);
    }
    if (invoice_no) {
      where.push("i.invoice_no = ?");
      params.push(invoice_no);
    }
    if (amount_from !== null) {
      where.push("i.amount >= ?");
      params.push(amount_from);
    }
    if (amount_to !== null) {
      where.push("i.amount <= ?");
      params.push(amount_to);
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
      ORDER BY ${sortField} ${sortOrder}, i.id DESC
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
      success: true,
      data: rows,
      page,
      limit,
      total,
      total_pages: Math.ceil(total / limit),
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

/** READ: one */
export async function getInvoiceById(req, res) {
  try {
    const ok = hasPermission(req, ["readAny", "readOwn"], "invoice");

    if (!ok) {
      return res.status(403).json({
        success: false,
        message: "Forbidden: insufficient permissions",
      });
    }

    const id = Number(req.params.id);
    const [rows] = await pool.query(
      `SELECT i.*, c.name AS customer_name, c.email AS customer_email, c.code AS customer_code,
        u.id   AS salesperson_id, u.name AS salesperson_name, u.short_form AS salesperson_short_form
        FROM invoices i
        JOIN customers c 
          ON c.id = i.customer_id
        LEFT JOIN users u 
          ON u.id = c.salesperson_id
        WHERE i.id = ?`,
      [id]
    );

    if (!rows.length) {
      return res
        .status(404)
        .json({ success: false, message: "Invoice not found" });
    }

    res.json({ success: true, data: rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

/** UPDATE */
export async function updateInvoice(req, res) {
  try {
    const ok = hasPermission(req, "updateAny", "invoice");

    if (!ok) {
      return res.status(403).json({
        success: false,
        message: "Forbidden: insufficient permissions",
      });
    }

    const id = Number(req.params.id);
    const [exist] = await pool.query("SELECT * FROM invoices WHERE id=?", [id]);
    if (!exist.length)
      return res
        .status(404)
        .json({ success: false, message: "Invoice not found" });

    const allowed = [
      "invoice_date",
      "customer_id",
      "invoice_no",
      "amount",
      "gst",
      "currency",
    ];
    const updates = [];
    const params = [];

    for (const key of allowed) {
      if (!(key in req.body)) continue;

      if (key === "currency") {
        const v = String(req.body.currency || "")
          .trim()
          .toUpperCase();
        if (!CURRENCIES.includes(v))
          return res
            .status(400)
            .json({ success: false, message: "Currency must be AUD or USD" });
        updates.push("currency = ?");
        params.push(v);
        continue;
      }
      if (key === "gst") {
        const g = Boolean(req.body.gst);
        updates.push("gst = ?");
        params.push(g);
        continue;
      }
      if (key === "amount") {
        const amt = Number(req.body.amount);
        if (!(amt > 0))
          return res
            .status(400)
            .json({ success: false, message: "Amount must be greater than 0" });
        updates.push("amount = ?");
        params.push(amt);
        continue;
      }
      if (key === "invoice_no") {
        const ino = String(req.body.invoice_no || "").trim();
        if (!ino)
          return res
            .status(400)
            .json({ success: false, message: "invoice_no invalid" });
        updates.push("invoice_no = ?");
        params.push(ino);
        continue;
      }
      if (key === "customer_id") {
        const cid = Number(req.body.customer_id);
        if (!cid)
          return res
            .status(400)
            .json({ success: false, message: "customer_id invalid" });
        const [[cust]] = await pool.query(
          "SELECT id FROM customers WHERE id=?",
          [cid]
        );
        if (!cust)
          return res
            .status(400)
            .json({ success: false, message: `Customer ${cid} not found` });
        updates.push("customer_id = ?");
        params.push(cid);
        continue;
      }
      if (key === "invoice_date") {
        const d = String(req.body.invoice_date || "").trim();
        if (!d)
          return res
            .status(400)
            .json({ success: false, message: "invoice_date invalid" });
        updates.push("invoice_date = ?");
        params.push(d);
        continue;
      }
    }

    if (!updates.length)
      return res
        .status(400)
        .json({ success: false, message: "No valid fields to update" });

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
      return res
        .status(400)
        .json({ success: false, message: "Invalid foreign key (customer)" });
    }
    res.status(500).json({ success: false, message: err.message });
  }
}

/** DELETE */
export async function deleteInvoice(req, res) {
  try {
    const ok = hasPermission(req, "deleteAny", "invoice");

    if (!ok) {
      return res.status(403).json({
        success: false,
        message: "Forbidden: insufficient permissions",
      });
    }

    const id = Number(req.params.id);
    const [r] = await pool.query("DELETE FROM invoices WHERE id=?", [id]);
    if (r.affectedRows === 0)
      return res
        .status(404)
        .json({ success: false, message: "Invoice not found" });

    res.json({ success: true, message: "Invoice deleted successfully" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

// 📊 GET /api/invoices/summary?from=YYYY-MM-DD&to=YYYY-MM-DD
export async function getInvoiceSummary(req, res) {
  try {
    const { from, to } = req.query;

    const ok = hasPermission(req, "readAny", "invoice");
    if (!ok) {
      return res.status(403).json({
        success: false,
        message: "Forbidden: insufficient permissions",
      });
    }

    // Validate dates
    const isValidDate = (d) => !!d && !isNaN(new Date(d).getTime());
    const params = [];
    let where = "";

    if (isValidDate(from) && isValidDate(to)) {
      where = "WHERE i.invoice_date BETWEEN ? AND ?";
      params.push(from, to);
    } else if (isValidDate(from)) {
      where = "WHERE i.invoice_date >= ?";
      params.push(from);
    } else if (isValidDate(to)) {
      where = "WHERE i.invoice_date <= ?";
      params.push(to);
    } else {
      console.log("⚠️  No valid dates provided — fetching all invoices");
    }

    const [rows] = await pool.query(
      `
      SELECT 
        c.id AS customer_id,
        c.name AS customer_name,
        c.email AS customer_email,
        i.id AS invoice_id,
        i.invoice_date AS date,
        i.invoice_no,
        i.amount,
        i.currency
      FROM invoices i
      JOIN customers c ON c.id = i.customer_id
      ${where}
      ORDER BY c.name ASC, i.invoice_date DESC
      `,
      params
    );

    if (!rows.length)
      return res.json({
        success: true,
        data: [],
        summary: {
          total_customers: 0,
          total_invoices: 0,
          total_amount_aud: 0,
          total_amount_usd: 0,
        },
        range: { from, to },
      });

    // Group by customer
    const grouped = {};
    for (const r of rows) {
      if (!grouped[r.customer_id]) {
        grouped[r.customer_id] = {
          customer_name: r.customer_name,
          customer_email: r.customer_email,
          no_of_invoices: 0,
          total_amount_aud: 0,
          total_amount_usd: 0,
          invoices: [],
        };
      }
      const g = grouped[r.customer_id];
      g.no_of_invoices++;
      if (r.currency === "AUD") g.total_amount_aud += Number(r.amount);
      if (r.currency === "USD") g.total_amount_usd += Number(r.amount);
      g.invoices.push({
        date: r.date,
        invoice_no: r.invoice_no,
        amount: Number(r.amount),
        currency: r.currency,
      });
    }

    // Build summary totals
    const customersArray = Object.values(grouped);

    const summary = {
      total_customers: customersArray.length,
      total_invoices: customersArray.reduce(
        (sum, c) => sum + c.no_of_invoices,
        0
      ),
      total_amount_aud: customersArray.reduce(
        (sum, c) => sum + c.total_amount_aud,
        0
      ),
      total_amount_usd: customersArray.reduce(
        (sum, c) => sum + c.total_amount_usd,
        0
      ),
    };

    return res.json({
      success: true,
      data: customersArray,
      summary,
      range: { from, to },
    });
  } catch (err) {
    console.error("💥 getInvoiceSummary error:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
}
