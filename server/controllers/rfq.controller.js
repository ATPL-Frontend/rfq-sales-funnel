import { pool } from "../lib/dbconnect-mysql.js";

// Allowed enum values — keep in sync with your table
const RFQ_PROGRESS = [
  "Waiting for Drawing",
  "Waiting for Customer’s BOM",
  "Waiting for vendor quotation",
  "Waiting for Salesperson",
  "Waiting for Drawing Revision",
  "Salesperson will cover rest",
  "Partially Submitted",
  "Sent to Salesperson (100%)",
  "Sent to Customer (Done)",
];

function normalizePreparedIds(input) {
  if (input == null) return [];
  const arr = Array.isArray(input) ? input : [input];
  const ids = arr
    .map((x) => (typeof x === "object" && x !== null ? x.id : x))
    .map(Number)
    .filter((n) => Number.isInteger(n) && n > 0);
  // de-duplicate
  return [...new Set(ids)];
}

async function insertPreparedPeople(conn, rfqId, userIds) {
  if (!userIds.length) return;
  const values = userIds.map((uid) => [rfqId, uid]);
  await conn.query(
    "INSERT INTO rfq_prepared_people (rfq_id, user_id) VALUES ?",
    [values]
  );
}

/** CREATE */
export async function createRFQ(req, res) {
  const conn = await pool.getConnection();
  try {
    const {
      receive_date,
      start_date,
      customer_id,
      salesperson_id,
      quantity,
      price,
      prepared_by, // array (ids or {id})
      end_date,
      progress = "Waiting for Drawing",
      rfq_location = null,
      remarks = null,
    } = req.body || {};
    
    const preparedIds = normalizePreparedIds(prepared_by);

    if (
      !receive_date ||
      !start_date ||
      !customer_id ||
      !salesperson_id ||
      !quantity ||
      !price ||
      !end_date ||
      preparedIds.length === 0
    ) {
      return res.status(400).json({ message: "Missing required fields" });
    }
    if (!RFQ_PROGRESS.includes(progress)) {
      return res.status(400).json({ message: "Invalid progress value" });
    }

    await conn.beginTransaction();

    const [r] = await conn.query(
      `INSERT INTO rfq
       (receive_date, start_date, customer_id, salesperson_id, quantity, price, progress, end_date, rfq_location, remarks)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        receive_date,
        start_date,
        customer_id,
        salesperson_id,
        quantity,
        price,
        progress,
        end_date,
        rfq_location,
        remarks,
      ]
    );
    const rfqId = r.insertId;

    // Insert prepared people
    await insertPreparedPeople(conn, rfqId, preparedIds);

    await conn.commit();

    // Return with aggregated prepared_by
    const [rows] = await pool.query(
      `SELECT r.*,
              c.name AS customer_name,
              u1.name AS salesperson_name,
              JSON_ARRAYAGG(JSON_OBJECT('id', u.id, 'name', u.name, 'email', u.email, 'short_form', u.short_form)) AS prepared_by
       FROM rfq r
       JOIN customers c ON c.id = r.customer_id
       JOIN users u1     ON u1.id = r.salesperson_id
       LEFT JOIN rfq_prepared_people rpp ON rpp.rfq_id = r.id
       LEFT JOIN users u ON u.id = rpp.user_id
       WHERE r.id = ?
       GROUP BY r.id`,
      [rfqId]
    );

    return res.status(201).json(rows[0]);
  } catch (err) {
    try {
      await conn.rollback();
    } catch {}
    if (err.code === "ER_NO_REFERENCED_ROW_2") {
      return res
        .status(400)
        .json({ message: "Invalid foreign key (customer or user)" });
    }
    return res.status(500).json({ message: err.message });
  } finally {
    conn.release();
  }
}

/** READ: list with filters + pagination */
export async function listRFQs(req, res) {
  try {
    const q = (req.query.q || "").trim();
    const customer_id = req.query.customer_id
      ? Number(req.query.customer_id)
      : null;
    const progress = (req.query.progress || "").trim();
    const date_from = (req.query.date_from || "").trim();
    const date_to = (req.query.date_to || "").trim();
    const limit = Math.min(parseInt(req.query.limit || "50", 10), 200);
    const page = Math.max(parseInt(req.query.page || "1", 10), 1);
    const offset = (page - 1) * limit;

    const where = [];
    const params = [];
    if (q) {
      where.push("(c.name LIKE ? OR r.progress LIKE ?)");
      params.push(`%${q}%`, `%${q}%`);
    }
    if (customer_id) {
      where.push("r.customer_id = ?");
      params.push(customer_id);
    }
    if (progress) {
      where.push("r.progress = ?");
      params.push(progress);
    }
    if (date_from) {
      where.push("r.receive_date >= ?");
      params.push(date_from);
    }
    if (date_to) {
      where.push("r.receive_date <= ?");
      params.push(date_to);
    }

    const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

    const [rows] = await pool.query(
      `SELECT r.*,
              c.name AS customer_name,
              JSON_ARRAYAGG(
                CASE WHEN u.id IS NULL THEN NULL
                     ELSE JSON_OBJECT('id', u.id, 'name', u.name, 'email', u.email, 'short_form', u.short_form)
                END
              ) AS prepared_by
       FROM rfq r
       JOIN customers c ON c.id = r.customer_id
       LEFT JOIN rfq_prepared_people rpp ON rpp.rfq_id = r.id
       LEFT JOIN users u ON u.id = rpp.user_id
       ${whereSql}
       GROUP BY r.id
       ORDER BY r.id DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    const [countRows] = await pool.query(
      `SELECT COUNT(*) as total
       FROM rfq r
       JOIN customers c ON c.id = r.customer_id
       ${whereSql}`,
      params
    );

    // Clean nulls from JSON_ARRAYAGG if no prepared people
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
      total: countRows[0].total,
      total_pages: Math.ceil(countRows[0].total / limit),
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

/** READ: one */
export async function getRFQById(req, res) {
  try {
    const id = Number(req.params.id);
    const [rows] = await pool.query(
      `SELECT r.*,
              c.name AS customer_name,
              u1.name AS salesperson_name,
              JSON_ARRAYAGG(JSON_OBJECT('id', u.id, 'name', u.name, 'email', u.email, 'short_form', u.short_form)) AS prepared_by
       FROM rfq r
       JOIN customers c ON c.id = r.customer_id
       JOIN users u1     ON u1.id = r.salesperson_id
       LEFT JOIN rfq_prepared_people rpp ON rpp.rfq_id = r.id
       LEFT JOIN users u ON u.id = rpp.user_id
       WHERE r.id = ?
       GROUP BY r.id`,
      [id]
    );
    if (!rows.length) return res.status(404).json({ message: "RFQ not found" });

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
export async function updateRFQ(req, res) {
  const conn = await pool.getConnection();
  try {
    const id = Number(req.params.id);
    const [exists] = await conn.query("SELECT id FROM rfq WHERE id=?", [id]);
    if (!exists.length)
      return res.status(404).json({ message: "RFQ not found" });

    const allowed = [
      "receive_date",
      "start_date",
      "customer_id",
      "salesperson_id",
      "quantity",
      "price",
      "progress",
      "end_date",
      "rfq_location",
      "remarks",
    ];

    const updates = [];
    const params = [];
    for (const key of allowed) {
      if (key in req.body) {
        if (key === "progress" && !RFQ_PROGRESS.includes(req.body[key])) {
          return res.status(400).json({ message: "Invalid progress value" });
        }
        updates.push(`${key} = ?`);
        params.push(req.body[key]);
      }
    }

    const hasPrepared = Object.prototype.hasOwnProperty.call(
      req.body,
      "prepared_by"
    );
    const preparedIds = hasPrepared
      ? normalizePreparedIds(req.body.prepared_by)
      : [];

    await conn.beginTransaction();

    if (updates.length) {
      params.push(id);
      await conn.query(
        `UPDATE rfq SET ${updates.join(", ")} WHERE id=?`,
        params
      );
    }

    if (hasPrepared) {
      // Replace all prepared people
      await conn.query("DELETE FROM rfq_prepared_people WHERE rfq_id=?", [id]);
      if (preparedIds.length) {
        await insertPreparedPeople(conn, id, preparedIds);
      }
    }

    await conn.commit();

    // Return updated row with aggregation
    const [rows] = await pool.query(
      `SELECT r.*,
              c.name AS customer_name,
              u1.name AS salesperson_name,
              JSON_ARRAYAGG(JSON_OBJECT('id', u.id, 'name', u.name, 'email', u.email, 'short_form', u.short_form)) AS prepared_by
       FROM rfq r
       JOIN customers c ON c.id = r.customer_id
       JOIN users u1     ON u1.id = r.salesperson_id
       LEFT JOIN rfq_prepared_people rpp ON rpp.rfq_id = r.id
       LEFT JOIN users u ON u.id = rpp.user_id
       WHERE r.id = ?
       GROUP BY r.id`,
      [id]
    );

    const row = rows[0];
    row.prepared_by = Array.isArray(row.prepared_by)
      ? row.prepared_by
      : JSON.parse(row.prepared_by || "[]").filter(Boolean);
    res.json(row);
  } catch (err) {
    try {
      await conn.rollback();
    } catch {}
    if (err.code === "ER_NO_REFERENCED_ROW_2") {
      return res
        .status(400)
        .json({ message: "Invalid foreign key (customer or user)" });
    }
    res.status(500).json({ message: err.message });
  } finally {
    conn.release();
  }
}

/** DELETE */
export async function deleteRFQ(req, res) {
  try {
    const id = Number(req.params.id);
    const [rows] = await pool.query("SELECT * FROM rfq WHERE id=?", [id]);
    if (!rows.length) return res.status(404).json({ message: "RFQ not found" });

    // Will fail if sales_funnel rows reference this RFQ (RESTRICT)
    await pool.query("DELETE FROM rfq WHERE id=?", [id]);
    res.json({ message: "RFQ deleted" });
  } catch (err) {
    if (err.code === "ER_ROW_IS_REFERENCED_2") {
      return res
        .status(409)
        .json({ message: "Cannot delete: RFQ is referenced by Sales Funnel" });
    }
    res.status(500).json({ message: err.message });
  }
}
