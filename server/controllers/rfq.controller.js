import { pool } from "../lib/dbconnect-mysql.js";
import { hasPermission } from "../utils/role.js";

const WORK_TYPES = [
  "Buy & Sale",
  "Cable Assembly",
  "Box Build",
  "Engineering Work",
];

/** ✅ Helper: Normalize prepared_by array into user IDs */
function normalizePreparedIds(input) {
  if (input == null) return [];
  const arr = Array.isArray(input) ? input : [input];
  const ids = arr
    .map((x) => (typeof x === "object" && x !== null ? x.id : x))
    .map(Number)
    .filter((n) => Number.isInteger(n) && n > 0);

  return [...new Set(ids)];
}

/** Normalize contents array */
function normalizeContents(input) {
  if (input == null) return [];
  const arr = Array.isArray(input) ? input : [input];

  const items = arr
    .map((x) =>
      String(x ?? "")
        .trim()
        .toUpperCase(),
    )
    .filter(Boolean);

  return [...new Set(items)];
}

/** Progress validator: accepts 0-100 numeric string OR "Done" */
function isValidProgress(value) {
  if (value == null) return false;

  const v = String(value).trim();

  if (v === "Done") return true;

  if (/^\d{1,3}$/.test(v)) {
    const num = Number(v);
    return num >= 0 && num <= 100;
  }

  return false;
}

/** ✅ Helper: Insert multiple prepared_people records */
async function insertPreparedPeople(conn, rfqId, userIds) {
  if (!userIds.length) return;
  const values = userIds.map((uid) => [rfqId, uid]);
  await conn.query(
    "INSERT INTO rfq_prepared_people (rfq_id, user_id) VALUES ?",
    [values],
  );
}

/** Replace RFQ contents */
async function replaceRFQContents(conn, rfqId, contents) {
  await conn.query("DELETE FROM rfq_contents WHERE rfq_id = ?", [rfqId]);

  if (!contents.length) return;

  const values = contents.map((content) => [rfqId, content]);
  await conn.query("INSERT INTO rfq_contents (rfq_id, content) VALUES ?", [
    values,
  ]);
}

/** Fetch one RFQ with joined data */
async function getRFQFullById(id) {
  const [rows] = await pool.query(
    `
    SELECT
      r.*,
      c.name AS customer_name,
      u1.name AS salesperson_name,
      JSON_ARRAYAGG(
        CASE
          WHEN u.id IS NULL THEN NULL
          ELSE JSON_OBJECT(
            'id', u.id,
            'name', u.name,
            'email', u.email,
            'short_form', u.short_form
          )
        END
      ) AS prepared_by,
      (
        SELECT JSON_ARRAYAGG(x.content)
        FROM (
          SELECT DISTINCT rc.content
          FROM rfq_contents rc
          WHERE rc.rfq_id = r.id
          ORDER BY rc.content
        ) x
      ) AS contents
    FROM rfq r
    JOIN customers c ON c.id = r.customer_id
    JOIN users u1 ON u1.id = r.salesperson_id
    LEFT JOIN rfq_prepared_people rpp ON rpp.rfq_id = r.id
    LEFT JOIN users u ON u.id = rpp.user_id
    WHERE r.id = ?
    GROUP BY r.id
    `,
    [id],
  );

  if (!rows.length) return null;

  const row = rows[0];

  row.prepared_by = Array.isArray(row.prepared_by)
    ? row.prepared_by.filter(Boolean)
    : JSON.parse(row.prepared_by || "[]").filter(Boolean);

  row.contents = Array.isArray(row.contents)
    ? row.contents.filter(Boolean)
    : JSON.parse(row.contents || "[]").filter(Boolean);

  return row;
}

/** CREATE */
export async function createRFQ(req, res) {
  const conn = await pool.getConnection();

  try {
    const ok = hasPermission(req, ["createAny", "createOwn"], "rfq");

    if (!ok) {
      return res.status(403).json({
        success: false,
        message: "Forbidden: insufficient permissions",
      });
    }

    const {
      receive_date,
      start_date,
      customer_id,
      salesperson_id,
      quantity,
      price = null,
      currency = "AUD",
      work_type = "Buy & Sale",
      prepared_by,
      end_date = null,
      progress = "0",
      rfq_location = null,
      remarks = null,
      contents = [],
    } = req.body || {};

    const preparedIds = normalizePreparedIds(prepared_by);
    const normalizedContents = normalizeContents(contents);

    if (
      !receive_date ||
      !start_date ||
      !customer_id ||
      !salesperson_id ||
      quantity == null ||
      preparedIds.length === 0
    ) {
      return res
        .status(400)
        .json({ success: false, message: "Missing required fields" });
    }

    if (!WORK_TYPES.includes(work_type)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid work_type value" });
    }

    if (!isValidProgress(progress)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid progress value" });
    }

    if (String(progress).trim() === "Done") {
      if (price == null || String(price).trim() === "") {
        return res.status(400).json({
          success: false,
          message: 'price is required when progress is "Done"',
        });
      }

      if (end_date == null || String(end_date).trim() === "") {
        return res.status(400).json({
          success: false,
          message: 'end_date is required when progress is "Done"',
        });
      }
    }

    const [[salesperson]] = await pool.query(
      `
      SELECT u.id, r.name AS role_name
      FROM users u
      JOIN user_roles ur ON ur.user_id = u.id
      JOIN roles r ON r.id = ur.role_id
      WHERE u.id = ?
        AND r.name = 'sales-person'
      LIMIT 1
      `,
      [salesperson_id],
    );

    if (!salesperson) {
      return res.status(400).json({
        success: false,
        message: "Invalid salesperson_id (must be a sales-person user)",
      });
    }

    await conn.beginTransaction();

    const [r] = await conn.query(
      `
      INSERT INTO rfq
      (
        receive_date,
        start_date,
        customer_id,
        salesperson_id,
        quantity,
        price,
        currency,
        work_type,
        progress,
        end_date,
        rfq_location,
        remarks
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        receive_date,
        start_date,
        customer_id,
        salesperson_id,
        quantity,
        price,
        currency,
        work_type,
        String(progress).trim(),
        end_date || null,
        rfq_location,
        remarks,
      ],
    );

    const rfqId = r.insertId;

    await insertPreparedPeople(conn, rfqId, preparedIds);
    await replaceRFQContents(conn, rfqId, normalizedContents);

    await conn.commit();

    const row = await getRFQFullById(rfqId);
    return res.status(201).json({ success: true, data: row });
  } catch (err) {
    try {
      await conn.rollback();
    } catch {}

    if (err.code === "ER_NO_REFERENCED_ROW_2") {
      return res.status(400).json({
        success: false,
        message: "Invalid foreign key (customer or user)",
      });
    }

    return res.status(500).json({ success: false, message: err.message });
  } finally {
    conn.release();
  }
}

/** LIST */
export async function listRFQs(req, res) {
  try {
    const ok = hasPermission(req, ["readAny", "readOwn"], "rfq");

    if (!ok) {
      return res.status(403).json({
        success: false,
        message: "Forbidden: insufficient permissions",
      });
    }

    const q = (req.query.q || "").trim();
    const customer_id = req.query.customer_id
      ? Number(req.query.customer_id)
      : null;
    const progress = (req.query.progress || "").trim();
    const receive_date = (req.query.receive_date || "").trim();
    const start_date = (req.query.start_date || "").trim();
    const end_date = (req.query.end_date || "").trim();
    const currency = (req.query.currency || "").trim();
    const content = (req.query.content || "").trim().toUpperCase();

    const limit = Math.min(
      Math.max(parseInt(req.query.limit || "50", 10), 1),
      200,
    );
    const page = Math.max(parseInt(req.query.page || "1", 10), 1);
    const offset = (page - 1) * limit;

    const where = [];
    const params = [];
    let joinContents = "";

    if (q) {
      where.push(`
        (
          c.name LIKE ?
          OR r.progress LIKE ?
          OR r.rfq_location LIKE ?
          OR r.remarks LIKE ?
          OR EXISTS (
            SELECT 1
            FROM rfq_contents rc2
            WHERE rc2.rfq_id = r.id
              AND rc2.content LIKE ?
          )
        )
      `);
      params.push(`%${q}%`, `%${q}%`, `%${q}%`, `%${q}%`, `%${q}%`);
    }

    if (customer_id) {
      where.push("r.customer_id = ?");
      params.push(customer_id);
    }

    if (progress) {
      where.push("r.progress = ?");
      params.push(progress);
    }

    if (receive_date) {
      where.push("r.receive_date = ?");
      params.push(receive_date);
    }

    if (start_date) {
      where.push("r.start_date = ?");
      params.push(start_date);
    }

    if (end_date) {
      where.push("r.end_date = ?");
      params.push(end_date);
    }

    if (currency) {
      where.push("r.currency = ?");
      params.push(currency);
    }

    if (content) {
      joinContents =
        "INNER JOIN rfq_contents rc_filter ON rc_filter.rfq_id = r.id";
      where.push("rc_filter.content = ?");
      params.push(content);
    }

    const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

    const sql = `
      SELECT
        r.*,
        c.name AS customer_name,
        JSON_ARRAYAGG(
          CASE
            WHEN u.id IS NULL THEN NULL
            ELSE JSON_OBJECT(
              'id', u.id,
              'name', u.name,
              'email', u.email,
              'short_form', u.short_form
            )
          END
        ) AS prepared_by,
        (
          SELECT JSON_ARRAYAGG(x.content)
          FROM (
            SELECT DISTINCT rc.content
            FROM rfq_contents rc
            WHERE rc.rfq_id = r.id
            ORDER BY rc.content
          ) x
        ) AS contents,
        EXISTS(SELECT 1 FROM sales_funnel s WHERE s.rfq_id = r.id) AS has_sales_funnel
      FROM rfq r
      JOIN customers c ON c.id = r.customer_id
      ${joinContents}
      LEFT JOIN rfq_prepared_people rpp ON rpp.rfq_id = r.id
      LEFT JOIN users u ON u.id = rpp.user_id
      ${whereSql}
      GROUP BY r.id
      ORDER BY r.id DESC
      LIMIT ${limit} OFFSET ${offset}
    `;

    const [rows] = await pool.query(sql, params);

    const countSql = `
      SELECT COUNT(DISTINCT r.id) AS total
      FROM rfq r
      JOIN customers c ON c.id = r.customer_id
      ${joinContents}
      ${whereSql}
    `;
    const [[{ total }]] = await pool.query(countSql, params);

    const results = rows.map((r) => ({
      ...r,
      prepared_by: Array.isArray(r.prepared_by)
        ? r.prepared_by.filter(Boolean)
        : JSON.parse(r.prepared_by || "[]").filter(Boolean),
      contents: Array.isArray(r.contents)
        ? r.contents.filter(Boolean)
        : JSON.parse(r.contents || "[]").filter(Boolean),
      has_sales_funnel: !!r.has_sales_funnel,
    }));

    res.json({
      success: true,
      data: results,
      page,
      limit,
      total,
      total_pages: Math.ceil(total / limit),
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

/** READ ONE */
// export async function getRFQById(req, res) {
//   try {
//     const ok = hasPermission(req, ["readAny", "readOwn"], "rfq");

//     if (!ok) {
//       return res.status(403).json({
//         success: false,
//         message: "Forbidden: insufficient permissions",
//       });
//     }

//     const id = Number(req.params.id);

//     const latestSF = `
//       SELECT sf.*
//       FROM sales_funnel sf
//       JOIN (
//         SELECT rfq_id, MAX(last_updated) AS lu
//         FROM sales_funnel
//         GROUP BY rfq_id
//       ) x ON x.rfq_id = sf.rfq_id AND x.lu = sf.last_updated
//     `;

//     const [rows] = await pool.query(
//       `SELECT
//          r.*,
//          c.name AS customer_name,
//          u1.name AS salesperson_name,
//          JSON_ARRAYAGG(
//            CASE WHEN u.id IS NULL THEN NULL
//                 ELSE JSON_OBJECT('id', u.id, 'name', u.name, 'email', u.email, 'short_form', u.short_form)
//            END
//          ) AS prepared_by,
//          EXISTS(SELECT 1 FROM sales_funnel s WHERE s.rfq_id = r.id) AS has_sales_funnel,
//          lsf.id AS latest_sales_funnel_id,
//          lsf.status AS latest_sales_funnel_status,
//          lsf.last_updated AS latest_sales_funnel_last_updated
//        FROM rfq r
//        JOIN customers c ON c.id = r.customer_id
//        JOIN users u1 ON u1.id = r.salesperson_id
//        LEFT JOIN (${latestSF}) lsf ON lsf.rfq_id = r.id
//        LEFT JOIN rfq_prepared_people rpp ON rpp.rfq_id = r.id
//        LEFT JOIN users u ON u.id = rpp.user_id
//        WHERE r.id = ?
//        GROUP BY r.id`,
//       [id],
//     );

//     if (!rows.length)
//       return res.status(404).json({ success: false, message: "RFQ not found" });

//     const row = rows[0];
//     row.prepared_by = Array.isArray(row.prepared_by)
//       ? row.prepared_by
//       : JSON.parse(row.prepared_by || "[]").filter(Boolean);
//     row.has_sales_funnel = !!row.has_sales_funnel;

//     res.json({ success: true, data: row });
//   } catch (err) {
//     res.status(500).json({ success: false, message: err.message });
//   }
// }

export async function getRFQById(req, res) {
  try {
    const ok = hasPermission(req, ["readAny", "readOwn"], "rfq");

    if (!ok) {
      return res.status(403).json({
        success: false,
        message: "Forbidden: insufficient permissions",
      });
    }

    const id = Number(req.params.id);
    const row = await getRFQFullById(id);

    if (!row) {
      return res.status(404).json({
        success: false,
        message: "RFQ not found",
      });
    }

    res.json({ success: true, data: row });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

/** UPDATE */
export async function updateRFQ(req, res) {
  const conn = await pool.getConnection();

  try {
    const ok = hasPermission(req, "updateAny", "rfq");

    if (!ok) {
      return res.status(403).json({
        success: false,
        message: "Forbidden: insufficient permissions",
      });
    }

    const id = Number(req.params.id);

    const [existsRows] = await conn.query(
      "SELECT id, progress, price, end_date FROM rfq WHERE id = ?",
      [id],
    );

    if (!existsRows.length) {
      return res.status(404).json({
        success: false,
        message: "RFQ not found",
      });
    }

    const existing = existsRows[0];

    const allowed = [
      "receive_date",
      "start_date",
      "customer_id",
      "salesperson_id",
      "quantity",
      "price",
      "currency",
      "work_type",
      "progress",
      "end_date",
      "rfq_location",
      "remarks",
    ];

    const updates = [];
    const params = [];

    const nextProgress = Object.prototype.hasOwnProperty.call(
      req.body,
      "progress",
    )
      ? String(req.body.progress).trim()
      : existing.progress;

    const nextPrice = Object.prototype.hasOwnProperty.call(req.body, "price")
      ? req.body.price
      : existing.price;

    const nextEndDate = Object.prototype.hasOwnProperty.call(
      req.body,
      "end_date",
    )
      ? req.body.end_date
      : existing.end_date;

    if (Object.prototype.hasOwnProperty.call(req.body, "progress")) {
      if (!isValidProgress(req.body.progress)) {
        return res
          .status(400)
          .json({ success: false, message: "Invalid progress value" });
      }
    }

    if (Object.prototype.hasOwnProperty.call(req.body, "work_type")) {
      if (!WORK_TYPES.includes(req.body.work_type)) {
        return res
          .status(400)
          .json({ success: false, message: "Invalid work_type value" });
      }
    }

    if (nextProgress === "Done") {
      if (nextPrice == null || String(nextPrice).trim() === "") {
        return res.status(400).json({
          success: false,
          message: 'price is required when progress is "Done"',
        });
      }

      if (nextEndDate == null || String(nextEndDate).trim() === "") {
        return res.status(400).json({
          success: false,
          message: 'end_date is required when progress is "Done"',
        });
      }
    }

    if (Object.prototype.hasOwnProperty.call(req.body, "salesperson_id")) {
      const [[salesperson]] = await pool.query(
        `
        SELECT u.id, r.name AS role_name
        FROM users u
        JOIN user_roles ur ON ur.user_id = u.id
        JOIN roles r ON r.id = ur.role_id
        WHERE u.id = ?
          AND r.name = 'sales-person'
        LIMIT 1
        `,
        [req.body.salesperson_id],
      );

      if (!salesperson) {
        return res.status(400).json({
          success: false,
          message: "Invalid salesperson_id (must be a sales-person user)",
        });
      }
    }

    for (const key of allowed) {
      if (Object.prototype.hasOwnProperty.call(req.body, key)) {
        updates.push(`${key} = ?`);

        if (key === "progress") {
          params.push(String(req.body[key]).trim());
        } else if (key === "end_date") {
          params.push(req.body[key] || null);
        } else {
          params.push(req.body[key]);
        }
      }
    }

    const hasPrepared = Object.prototype.hasOwnProperty.call(
      req.body,
      "prepared_by",
    );
    const preparedIds = hasPrepared
      ? normalizePreparedIds(req.body.prepared_by)
      : [];

    const hasContents = Object.prototype.hasOwnProperty.call(
      req.body,
      "contents",
    );
    const normalizedContents = hasContents
      ? normalizeContents(req.body.contents)
      : [];

    await conn.beginTransaction();

    if (updates.length) {
      params.push(id);
      await conn.query(
        `UPDATE rfq SET ${updates.join(", ")} WHERE id = ?`,
        params,
      );
    }

    if (hasPrepared) {
      await conn.query("DELETE FROM rfq_prepared_people WHERE rfq_id = ?", [
        id,
      ]);
      if (preparedIds.length) {
        await insertPreparedPeople(conn, id, preparedIds);
      }
    }

    if (hasContents) {
      await replaceRFQContents(conn, id, normalizedContents);
    }

    await conn.commit();

    const row = await getRFQFullById(id);
    res.json({ success: true, data: row });
  } catch (err) {
    try {
      await conn.rollback();
    } catch {}

    res.status(500).json({ success: false, message: err.message });
  } finally {
    conn.release();
  }
}

/** DELETE */
export async function deleteRFQ(req, res) {
  try {
    const ok = hasPermission(req, "deleteAny", "rfq");

    if (!ok) {
      return res.status(403).json({
        success: false,
        message: "Forbidden: insufficient permissions",
      });
    }

    const id = Number(req.params.id);

    const [rows] = await pool.query("SELECT * FROM rfq WHERE id = ?", [id]);
    if (!rows.length) {
      return res.status(404).json({
        success: false,
        message: "RFQ not found",
      });
    }

    await pool.query("DELETE FROM rfq WHERE id = ?", [id]);

    res.json({
      success: true,
      message: "RFQ deleted successfully",
    });
  } catch (err) {
    if (err.code === "ER_ROW_IS_REFERENCED_2") {
      return res.status(409).json({
        success: false,
        message: "Cannot delete: RFQ is referenced by Sales Funnel",
      });
    }

    res.status(500).json({ success: false, message: err.message });
  }
}
