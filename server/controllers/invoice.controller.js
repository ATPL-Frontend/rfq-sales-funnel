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
  const conn = await pool.getConnection();

  try {
    const ok = hasPermission(req, "createAny", "invoice");

    if (!ok) {
      return res.status(403).json({
        success: false,
        message: "Forbidden: insufficient permissions",
      });
    }

    let { invoice_date, create_invoice_date, customer_id, items } =
      req.body || {};

    invoice_date = String(invoice_date || "").trim();
    create_invoice_date = create_invoice_date
      ? String(create_invoice_date).trim()
      : null;
    customer_id = Number(customer_id);

    if (!invoice_date || !customer_id || !invoice_no || !amount || !currency) {
      return res.status(400).json({
        success: false,
        message:
          "invoice_date, customer_id, amount, currency, invoice_no are required",
      });
    }

    const [[cust]] = await conn.query("SELECT id FROM customers WHERE id = ?", [
      customer_id,
    ]);
    if (!cust)
      return res
        .status(400)
        .json({ success: false, message: `Customer ${customer_id} not found` });

    await conn.beginTransaction();

    const createdIds = [];

    for (let i = 0; i < items.length; i++) {
      const item = items[i];

      const invoice_no = String(item.invoice_no || "").trim();
      const amount = Number(item.amount);
      const currency = String(item.currency || "")
        .trim()
        .toUpperCase();
      const gst = item.gst === undefined ? true : Boolean(item.gst);

      if (!invoice_no || !currency || !(amount > 0)) {
        throw new Error(`Invalid invoice item at index ${i + 1}`);
      }

      if (!CURRENCIES.includes(currency)) {
        throw new Error(`Invalid currency at invoice item ${i + 1}`);
      }

      const [r] = await conn.query(
        `
        INSERT INTO invoices
          (invoice_date, create_invoice_date, customer_id, invoice_no, amount, gst, currency)
        VALUES
          (?, ?, ?, ?, ?, ?, ?)
        `,
        [
          invoice_date,
          create_invoice_date,
          customer_id,
          invoice_no,
          amount,
          gst,
          currency,
        ]
      );

      createdIds.push(r.insertId);
    }

    await conn.commit();

    // Fetch all created invoices
    const [rows] = await conn.query(
      `
      SELECT
        i.*,
        c.name AS customer_name,
        c.email AS customer_email,
        c.code AS customer_code
      FROM invoices i
      JOIN customers c ON c.id = i.customer_id
      WHERE i.id IN (?)
      ORDER BY i.id ASC
      `,
      [createdIds]
    );

    return res.status(201).json({
      success: true,
      message: "Invoices created successfully",
      data: rows,
    });
  } catch (err) {
    await conn.rollback();

    return res.status(500).json({
      success: false,
      message: err.message,
    });
  } finally {
    conn.release();
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
    // Sent date filters
    const date_from = (req.query.date_from || "").trim();
    const date_to = (req.query.date_to || "").trim();

    // Created date filters
    const create_date_from = (req.query.create_date_from || "").trim();
    const create_date_to = (req.query.create_date_to || "").trim();
    const q = (req.query.q || "").trim();
    const rawSortField = (req.query.sort_field || "invoice_date").trim();
    const rawSortOrder = (req.query.sort_order || "desc").trim().toLowerCase();

    const allowedSortFields = {
      invoice_date: "i.invoice_date",
      create_invoice_date: "i.create_invoice_date",
      amount: "i.amount",
    };

    const sortField =
      allowedSortFields[rawSortField] ||
      allowedSortFields["invoice_date"] ||
      allowedSortFields.invoice_date;

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
    if (date_from || date_to) {
      where.push("i.invoice_date >= ?");
      params.push(date_from || "0000-01-01");

      where.push("i.invoice_date <= ?");
      params.push(date_to || "9999-12-31");
    } else if (create_date_from || create_date_to) {
      where.push("i.create_invoice_date >= ?");
      params.push(create_date_from || "0000-01-01");

      where.push("i.create_invoice_date <= ?");
      params.push(create_date_to || "9999-12-31");
    }
    if (q) {
      where.push("(c.name LIKE ? OR c.email LIKE ?)");
      params.push(`%${q}%`, `%${q}%`);
    }

    const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

    const sql = `
      SELECT
        i.*,
        c.name AS customer_name,
        c.email AS customer_email,
        c.code AS customer_code
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
      "create_invoice_date",
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
      if (key === "create_invoice_date") {
        const d =
          req.body.create_invoice_date === null ||
          req.body.create_invoice_date === ""
            ? null
            : String(req.body.create_invoice_date).trim();

        updates.push("create_invoice_date = ?");
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
    const { from, to, salesperson_id } = req.query;

    const date_type =
      req.query.date_type === "create_invoice_date"
        ? "create_invoice_date"
        : "invoice_date";

    const ok = hasPermission(req, "readAny", "invoice");
    if (!ok) {
      return res.status(403).json({
        success: false,
        message: "Forbidden: insufficient permissions",
      });
    }

    const isValidDate = (d) => !!d && !isNaN(new Date(d).getTime());
    const params = [];
    const whereParts = [];

    // Date filters
    if (isValidDate(from) && isValidDate(to)) {
      whereParts.push(`i.${date_type} BETWEEN ? AND ?`);
      params.push(from, to);
    } else if (isValidDate(from)) {
      whereParts.push(`i.${date_type} >= ?`);
      params.push(from);
    } else if (isValidDate(to)) {
      whereParts.push(`i.${date_type} <= ?`);
      params.push(to);
    }

    // Salesperson filter
    if (salesperson_id) {
      whereParts.push("c.salesperson_id = ?");
      params.push(Number(salesperson_id));
    }

    const where = whereParts.length ? `WHERE ${whereParts.join(" AND ")}` : "";

    const [rows] = await pool.query(
      `
      SELECT 
        c.id AS customer_id,
        c.name AS customer_name,
        c.email AS customer_email,
        u.id AS salesperson_id,
        u.name AS salesperson_name,
        u.short_form AS salesperson_short_form,
        i.id AS invoice_id,
        i.invoice_date,
        i.create_invoice_date,
        i.invoice_no,
        i.amount,
        i.currency,
        i.gst
      FROM invoices i
      JOIN customers c ON c.id = i.customer_id
      LEFT JOIN users u ON u.id = c.salesperson_id
      ${where}
      ORDER BY c.name ASC, i.${date_type} DESC
      `,
      params
    );

    if (!rows.length)
      return res.json({
        success: true,
        data: [],
        salespersonSummary: [],
        summary: {
          total_customers: 0,
          total_invoices: 0,
          total_amount_aud: 0,
          total_amount_usd: 0,
        },
        range: { from, to, salesperson_id },
      });

    // Group by customer
    const customerGrouped = {};
    // Group by salesperson
    const salespersonGrouped = {};

    for (const r of rows) {
      // ---- CUSTOMER SUMMARY ----
      if (!customerGrouped[r.customer_id]) {
        customerGrouped[r.customer_id] = {
          customer_name: r.customer_name,
          customer_email: r.customer_email,
          salesperson_id: r.salesperson_id,
          salesperson_name: r.salesperson_name,
          salesperson_short_form: r.salesperson_short_form,
          no_of_invoices: 0,
          total_amount_aud: 0,
          total_amount_usd: 0,
          invoices: [],
        };
      }

      const cg = customerGrouped[r.customer_id];
      cg.no_of_invoices++;
      if (r.currency === "AUD") cg.total_amount_aud += Number(r.amount);
      if (r.currency === "USD") cg.total_amount_usd += Number(r.amount);

      cg.invoices.push({
        date: r.invoice_date,
        create_invoice_date: r.create_invoice_date,
        invoice_no: r.invoice_no,
        amount: Number(r.amount),
        currency: r.currency,
        gst: r.gst ? 1 : 0,
      });

      // ---- SALESPERSON SUMMARY ----
      if (!salespersonGrouped[r.salesperson_id]) {
        salespersonGrouped[r.salesperson_id] = {
          salesperson_id: r.salesperson_id,
          salesperson_name: r.salesperson_name,
          salesperson_short_form: r.salesperson_short_form,
          total_customers: new Set(), // will convert later
          total_invoices: 0,
          total_aud: 0,
          total_usd: 0,
        };
      }

      const sg = salespersonGrouped[r.salesperson_id];
      if (r.customer_id) sg.total_customers.add(r.customer_id);
      sg.total_invoices++;

      if (r.currency === "AUD") sg.total_aud += Number(r.amount);
      if (r.currency === "USD") sg.total_usd += Number(r.amount);
    }

    // Convert sets
    const salespersonSummary = Object.values(salespersonGrouped).map((s) => ({
      ...s,
      total_customers: s.total_customers.size,
    }));

    const customersArray = Object.values(customerGrouped);

    // MAIN SUMMARY
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
      salespersonSummary,
      summary,
      range: { from, to, salesperson_id },
    });
  } catch (err) {
    console.error("💥 getInvoiceSummary error:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
}

export async function getInvoiceMonthlySummary(req, res) {
  try {
    const { from, to, salesperson_id } = req.query;

    const ok = hasPermission(req, "readAny", "invoice");
    if (!ok) {
      return res.status(403).json({
        success: false,
        message: "Forbidden: insufficient permissions",
      });
    }

    const isValidDate = (d) => !!d && !isNaN(new Date(d).getTime());
    const params = [];
    const whereParts = [];

    if (isValidDate(from) && isValidDate(to)) {
      whereParts.push("i.invoice_date BETWEEN ? AND ?");
      params.push(from, to);
    } else if (isValidDate(from)) {
      whereParts.push("i.invoice_date >= ?");
      params.push(from);
    } else if (isValidDate(to)) {
      whereParts.push("i.invoice_date <= ?");
      params.push(to);
    }

    if (salesperson_id) {
      whereParts.push("c.salesperson_id = ?");
      params.push(Number(salesperson_id));
    }

    // Note: Remove the users condition from the first query since it doesn't join users table
    const where = whereParts.length ? `WHERE ${whereParts.join(" AND ")}` : "";

    // Query 1: Basic monthly summary (without users join)
    const monthlySql = `
      SELECT 
        DATE_FORMAT(i.invoice_date, '%Y-%m') AS \`year_month\`,
        DATE_FORMAT(i.invoice_date, '%b %Y') AS month_name,
        COUNT(i.id) AS num_invoices,
        SUM(CASE WHEN i.currency = 'AUD' THEN i.amount ELSE 0 END) AS total_aud,
        SUM(CASE WHEN i.currency = 'USD' THEN i.amount ELSE 0 END) AS total_usd
      FROM invoices i
      ${where}
      GROUP BY DATE_FORMAT(i.invoice_date, '%Y-%m'), DATE_FORMAT(i.invoice_date, '%b %Y')
      ORDER BY MIN(i.invoice_date) ASC;
    `;

    // Query 2: Salesperson monthly summary (with users join)
    const salespersonWhereParts = [...whereParts];
    const salespersonParams = [...params];

    // Add active users condition only for the salesperson query
    salespersonWhereParts.push("(u.id IS NULL OR u.is_active = TRUE)");

    const salespersonWhere = salespersonWhereParts.length
      ? `WHERE ${salespersonWhereParts.join(" AND ")}`
      : "";

    const salespersonSql = `
      SELECT 
        DATE_FORMAT(i.invoice_date, '%Y-%m') AS \`year_month\`,
        DATE_FORMAT(i.invoice_date, '%b %Y') AS month_name,
        u.id AS salesperson_id,
        u.name AS salesperson_name,
        u.short_form AS salesperson_short_form,
        COUNT(i.id) AS num_invoices,
        SUM(CASE WHEN i.currency = 'AUD' THEN i.amount ELSE 0 END) AS total_aud,
        SUM(CASE WHEN i.currency = 'USD' THEN i.amount ELSE 0 END) AS total_usd
      FROM invoices i
      JOIN customers c ON c.id = i.customer_id
      LEFT JOIN users u ON u.id = c.salesperson_id
      ${salespersonWhere}
      GROUP BY 
        DATE_FORMAT(i.invoice_date, '%Y-%m'),
        DATE_FORMAT(i.invoice_date, '%b %Y'),
        u.id, u.name, u.short_form
      ORDER BY 
        MIN(i.invoice_date) ASC,
        u.name ASC;
    `;

    // Execute both queries
    const [monthlyRows] = await pool.query(monthlySql, params);
    const [salespersonRows] = await pool.query(
      salespersonSql,
      salespersonParams
    );

    // Process monthly data
    const monthlyData = monthlyRows.map((r) => ({
      month: r.month_name,
      year_month: r.year_month,
      num_invoices: Number(r.num_invoices),
      total_aud: Number(r.total_aud || 0),
      total_usd: Number(r.total_usd || 0),
    }));

    // Process salesperson data
    const salespersonSummary = {};
    const flattenedData = [];

    for (const row of salespersonRows) {
      const spKey = row.salesperson_id || "unassigned";

      if (!salespersonSummary[spKey]) {
        salespersonSummary[spKey] = {
          salesperson_id: row.salesperson_id,
          salesperson_name: row.salesperson_name || "Unassigned",
          salesperson_short_form: row.salesperson_short_form || "N/A",
          total_invoices: 0,
          total_aud: 0,
          total_usd: 0,
          monthly_data: [],
        };
      }

      const monthData = {
        month: row.month_name,
        year_month: row.year_month,
        num_invoices: Number(row.num_invoices || 0),
        total_aud: Number(row.total_aud || 0),
        total_usd: Number(row.total_usd || 0),
      };

      salespersonSummary[spKey].monthly_data.push(monthData);
      salespersonSummary[spKey].total_invoices += Number(row.num_invoices || 0);
      salespersonSummary[spKey].total_aud += Number(row.total_aud || 0);
      salespersonSummary[spKey].total_usd += Number(row.total_usd || 0);

      flattenedData.push({
        month: row.month_name,
        year_month: row.year_month,
        salesperson_id: row.salesperson_id,
        salesperson_name: row.salesperson_name || "Unassigned",
        salesperson_short_form: row.salesperson_short_form || "N/A",
        num_invoices: Number(row.num_invoices || 0),
        total_aud: Number(row.total_aud || 0),
        total_usd: Number(row.total_usd || 0),
      });
    }

    const summary = {
      total_invoices: monthlyData.reduce((a, b) => a + b.num_invoices, 0),
      total_aud: monthlyData.reduce((a, b) => a + b.total_aud, 0),
      total_usd: monthlyData.reduce((a, b) => a + b.total_usd, 0),
      total_salespersons: Object.keys(salespersonSummary).length,
    };

    return res.json({
      success: true,
      range: { from, to, salesperson_id },
      data: monthlyData, // For backward compatibility
      summary,
      salesperson_summary: Object.values(salespersonSummary),
      flattened_data: flattenedData,
    });
  } catch (err) {
    console.error("💥 getInvoiceMonthlySummary error:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
}
