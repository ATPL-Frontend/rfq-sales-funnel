import { pool } from "../lib/dbconnect-mysql.js";
import ac from "../utils/roles.js";

/**
 * Creation rule:
 * - Only admins/super-admins OR RFQ.progress in
 *   ['Sent to Salesperson (100%)', 'Sent to Customer (Done)']
 */
const ALLOWED_RFQ_PROGRESS = [
  "Sent to Salesperson (100%)",
  "Sent to Customer (Done)",
];

/** ✅ Helper: AccessControl check */
function checkPermission(roles, action, resource) {
  for (const role of roles) {
    const permission = ac.can(role)[action](resource);
    if (permission.granted) return true;
  }
  return false;
}

/** CREATE */
export async function createSalesFunnel(req, res) {
  try {
    const roles = Array.isArray(req.user?.role)
      ? req.user.role
      : [req.user?.role || "user"];

    if (!checkPermission(roles, "createAny", "sales-funnel")) {
      return res.status(403).json({ message: "Forbidden: insufficient permissions" });
    }

    const {
      rfq_id,
      quote_date,
      sent_by,
      description = null,
      exp_win_date,
      status = null,
      remarks = null,
    } = req.body;

    if (!rfq_id || !quote_date || !sent_by || !exp_win_date) {
      return res.status(400).json({
        message: "rfq_id, quote_date, sent_by, exp_win_date are required",
      });
    }

    // Check RFQ and its progress
    const [[rfq]] = await pool.query("SELECT id, progress FROM rfq WHERE id=?", [
      rfq_id,
    ]);
    if (!rfq) return res.status(404).json({ message: "RFQ not found" });

    const isAdmin = roles.includes("admin") || roles.includes("super-admin");
    if (!isAdmin && !ALLOWED_RFQ_PROGRESS.includes(rfq.progress)) {
      return res.status(403).json({
        message:
          "You cannot create a Sales Funnel until the RFQ progress is 'Sent to Salesperson (100%)' or 'Sent to Customer (Done)'",
      });
    }

    const [r] = await pool.query(
      `INSERT INTO sales_funnel
        (rfq_id, quote_date, sent_by, description, exp_win_date, last_updated, status, remarks)
       VALUES (?, ?, ?, ?, ?, NOW(), ?, ?)`,
      [rfq_id, quote_date, sent_by, description, exp_win_date, status, remarks]
    );

    const [row] = await pool.query(
      `SELECT sf.*, r.progress AS rfq_progress
       FROM sales_funnel sf
       JOIN rfq r ON r.id = sf.rfq_id
       WHERE sf.id=?`,
      [r.insertId]
    );

    res.status(201).json(row[0]);
  } catch (err) {
    if (err.code === "ER_NO_REFERENCED_ROW_2") {
      return res.status(400).json({ message: "Invalid foreign key (rfq or user)" });
    }
    res.status(500).json({ message: err.message });
  }
}

/** LIST */
export async function listSalesFunnels(req, res) {
  try {
    const roles = Array.isArray(req.user?.role)
      ? req.user.role
      : [req.user?.role || "user"];

    if (
      !checkPermission(roles, "readAny", "sales-funnel") &&
      !checkPermission(roles, "readOwn", "sales-funnel")
    ) {
      return res.status(403).json({ message: "Forbidden: insufficient permissions" });
    }

    const rfq_id = req.query.rfq_id ? Number(req.query.rfq_id) : null;
    const status = (req.query.status || "").trim();
    const limit = Math.min(parseInt(req.query.limit || "50", 10), 200);
    const page = Math.max(parseInt(req.query.page || "1", 10), 1);
    const offset = (page - 1) * limit;

    const where = [];
    const params = [];
    if (rfq_id) {
      where.push("sf.rfq_id = ?");
      params.push(rfq_id);
    }
    if (status) {
      where.push("sf.status  = ?");
      params.push(status);
    }
    const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

    const [rows] = await pool.query(
      `SELECT
         sf.*,
         r.receive_date, r.start_date, r.quantity, r.price, r.end_date,
         r.rfq_location, r.remarks AS rfq_remarks, r.progress AS rfq_progress,
         c.id AS customer_id, c.name AS customer_name, c.email AS customer_email, c.code AS customer_code,
         u1.id AS salesperson_user_id, u1.name AS salesperson_name, u1.email AS salesperson_email,
         JSON_ARRAYAGG(
           CASE WHEN u.id IS NULL THEN NULL
                ELSE JSON_OBJECT('id', u.id, 'name', u.name, 'email', u.email, 'short_form', u.short_form)
           END
         ) AS prepared_by
       FROM sales_funnel sf
       JOIN rfq r ON r.id = sf.rfq_id
       JOIN customers c ON c.id = r.customer_id
       JOIN users u1 ON u1.id = r.salesperson_id
       LEFT JOIN rfq_prepared_people rpp ON rpp.rfq_id = r.id
       LEFT JOIN users u ON u.id = rpp.user_id
       ${whereSql}
       GROUP BY sf.id
       ORDER BY sf.last_updated DESC, sf.id DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    const [[{ total }]] = await pool.query(
      `SELECT COUNT(*) AS total FROM sales_funnel sf ${whereSql}`,
      params
    );

    const results = rows.map((r) => ({
      ...r,
      prepared_by: Array.isArray(r.prepared_by)
        ? r.prepared_by
        : JSON.parse(r.prepared_by || "[]").filter(Boolean),
    }));

    res.json({
      results,
      page,
      limit,
      total,
      total_pages: Math.ceil(total / limit),
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

/** READ ONE */
export async function getSalesFunnelById(req, res) {
  try {
    const roles = Array.isArray(req.user?.role)
      ? req.user.role
      : [req.user?.role || "user"];

    if (
      !checkPermission(roles, "readAny", "sales-funnel") &&
      !checkPermission(roles, "readOwn", "sales-funnel")
    ) {
      return res.status(403).json({ message: "Forbidden: insufficient permissions" });
    }

    const id = Number(req.params.id);

    const [rows] = await pool.query(
      `SELECT
         sf.*,
         r.receive_date, r.start_date, r.quantity, r.price, r.end_date,
         r.rfq_location, r.remarks AS rfq_remarks, r.progress AS rfq_progress,
         c.id AS customer_id, c.name AS customer_name, c.email AS customer_email, c.code AS customer_code,
         u1.id AS salesperson_user_id, u1.name AS salesperson_name, u1.email AS salesperson_email,
         JSON_ARRAYAGG(
           CASE WHEN u.id IS NULL THEN NULL
                ELSE JSON_OBJECT('id', u.id, 'name', u.name, 'email', u.email, 'short_form', u.short_form)
           END
         ) AS prepared_by
       FROM sales_funnel sf
       JOIN rfq r ON r.id = sf.rfq_id
       JOIN customers c ON c.id = r.customer_id
       JOIN users u1 ON u1.id = r.salesperson_id
       LEFT JOIN rfq_prepared_people rpp ON rpp.rfq_id = r.id
       LEFT JOIN users u ON u.id = rpp.user_id
       WHERE sf.id = ?
       GROUP BY sf.id`,
      [id]
    );

    if (!rows.length) {
      return res.status(404).json({ message: "Sales Funnel not found" });
    }

    const row = rows[0];
    row.prepared_by = Array.isArray(row.prepared_by)
      ? row.prepared_by
      : JSON.parse(row.prepared_by || "[]").filter(Boolean);

    res.json(row);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

/** UPDATE */
export async function updateSalesFunnel(req, res) {
  try {
    const roles = Array.isArray(req.user?.role)
      ? req.user.role
      : [req.user?.role || "user"];

    if (!checkPermission(roles, "updateAny", "sales-funnel")) {
      return res.status(403).json({ message: "Forbidden: insufficient permissions" });
    }

    const id = Number(req.params.id);
    const [exists] = await pool.query("SELECT * FROM sales_funnel WHERE id=?", [id]);
    if (!exists.length)
      return res.status(404).json({ message: "Sales Funnel not found" });

    const allowed = [
      "quote_date",
      "sent_by",
      "description",
      "exp_win_date",
      "status",
      "remarks",
    ];
    const updates = [];
    const params = [];

    for (const key of allowed) {
      if (key in req.body) {
        updates.push(`${key} = ?`);
        params.push(req.body[key]);
      }
    }

    if (!updates.length)
      return res.status(400).json({ message: "No valid fields to update" });

    updates.push("last_updated = NOW()");
    params.push(id);

    await pool.query(`UPDATE sales_funnel SET ${updates.join(", ")} WHERE id = ?`, params);

    const [rows] = await pool.query("SELECT * FROM sales_funnel WHERE id=?", [id]);
    res.json(rows[0]);
  } catch (err) {
    if (err.code === "ER_NO_REFERENCED_ROW_2") {
      return res.status(400).json({ message: "Invalid foreign key (user)" });
    }
    res.status(500).json({ message: err.message });
  }
}

/** DELETE */
export async function deleteSalesFunnel(req, res) {
  try {
    const roles = Array.isArray(req.user?.role)
      ? req.user.role
      : [req.user?.role || "user"];

    if (!checkPermission(roles, "deleteAny", "sales-funnel")) {
      return res.status(403).json({ message: "Forbidden: insufficient permissions" });
    }

    const id = Number(req.params.id);
    const [rows] = await pool.query("SELECT * FROM sales_funnel WHERE id=?", [id]);
    if (!rows.length)
      return res.status(404).json({ message: "Sales Funnel not found" });

    await pool.query("DELETE FROM sales_funnel WHERE id=?", [id]);
    res.json({ message: "Sales Funnel deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}
