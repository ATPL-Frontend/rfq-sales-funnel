import { pool } from "../lib/dbconnect-mysql.js";

/**
 * Creation rule:
 * - Only admins/super-admins OR RFQ.progress in
 *   ['Sent to Salesperson (100%)', 'Sent to Customer (Done)']
 */

const ALLOWED_RFQ_PROGRESS = [
  "Sent to Salesperson (100%)",
  "Sent to Customer (Done)",
];

/** CREATE */
export async function createSalesFunnel(req, res) {
  try {
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
      return res
        .status(400)
        .json({
          message: "rfq_id, quote_date, sent_by, exp_win_date are required",
        });
    }

    // Check RFQ and its progress
    const [[rfq]] = await pool.query(
      "SELECT id, progress FROM rfq WHERE id=?",
      [rfq_id]
    );
    if (!rfq) return res.status(404).json({ message: "RFQ not found" });

    // Roles come from req.user (set by auth middleware)
    const roles = Array.isArray(req.user?.role) ? req.user.role : [];
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
      return res
        .status(400)
        .json({ message: "Invalid foreign key (rfq or user)" });
    }
    res.status(500).json({ message: err.message });
  }
}

/** READ: list (optionally by rfq_id) with pagination */
export async function listSalesFunnels(req, res) {
  try {
    const rfq_id = req.query.rfq_id ? Number(req.query.rfq_id) : null;
    const limit = Math.min(parseInt(req.query.limit || "50", 10), 200);
    const page = Math.max(parseInt(req.query.page || "1", 10), 1);
    const offset = (page - 1) * limit;

    const where = [];
    const params = [];
    if (rfq_id) {
      where.push("sf.rfq_id=?");
      params.push(rfq_id);
    }
    const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

    const [rows] = await pool.query(
      `SELECT sf.*, r.progress AS rfq_progress
       FROM sales_funnel sf
       JOIN rfq r ON r.id = sf.rfq_id
       ${whereSql}
       ORDER BY sf.id DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    const [countRows] = await pool.query(
      `SELECT COUNT(*) as total
       FROM sales_funnel sf
       ${rfq_id ? "WHERE sf.rfq_id=?" : ""}`,
      rfq_id ? [rfq_id] : []
    );

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
export async function getSalesFunnelById(req, res) {
  try {
    const id = Number(req.params.id);
    const [rows] = await pool.query(
      `SELECT sf.*, r.progress AS rfq_progress
       FROM sales_funnel sf
       JOIN rfq r ON r.id = sf.rfq_id
       WHERE sf.id = ?`,
      [id]
    );
    if (!rows.length)
      return res.status(404).json({ message: "Sales Funnel not found" });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

/** UPDATE */
export async function updateSalesFunnel(req, res) {
  try {
    const id = Number(req.params.id);
    const [exists] = await pool.query("SELECT * FROM sales_funnel WHERE id=?", [
      id,
    ]);
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

    // Force last_updated to NOW()
    updates.push("last_updated = NOW()");
    params.push(id);

    await pool.query(
      `UPDATE sales_funnel SET ${updates.join(", ")} WHERE id = ?`,
      params
    );

    const [rows] = await pool.query("SELECT * FROM sales_funnel WHERE id=?", [
      id,
    ]);
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
    const id = Number(req.params.id);
    const [rows] = await pool.query("SELECT * FROM sales_funnel WHERE id=?", [
      id,
    ]);
    if (!rows.length)
      return res.status(404).json({ message: "Sales Funnel not found" });

    await pool.query("DELETE FROM sales_funnel WHERE id=?", [id]);
    res.json({ message: "Sales Funnel deleted" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}
