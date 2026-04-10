import { pool } from "../lib/dbconnect-mysql.js";
import { hasPermission } from "../utils/role.js";

/**
 * Helper to check permission using AccessControl
 * @param {string[]} roles - user roles from req.user.role
 * @param {string} action - e.g., "createAny", "readOwn"
 * @param {string} resource - e.g., "customer"
 */

/** CREATE */
export async function createCustomer(req, res) {
  try {
    const ok = hasPermission(req, "createAny", "customer");

    if (!ok) {
      return res.status(403).json({
        success: false,
        message: "Forbidden: insufficient permissions",
      });
    }

    // Extract data
    let {
      name,
      email = [],
      web_address = null,
      code = null,
      salesperson_id = null,
      currency = "AUD",
      gst = true,
    } = req.body || {};

    name = String(name || "").trim();

    // Email normalization
    if (!Array.isArray(email)) {
      if (typeof email === "string" && email.trim()) {
        email = email
          .split(",")
          .map((e) => e.trim().toLowerCase())
          .filter(Boolean);
      } else {
        email = [];
      }
    }

    web_address = web_address ? String(web_address).trim() : null;
    code = code ? String(code).trim() : null;

    if (!name) {
      return res.status(400).json({
        success: false,
        message: "Name is required",
      });
    }

    /** Validate currency */
    currency = String(currency).toUpperCase();
    if (!["AUD", "USD"].includes(currency)) {
      return res.status(400).json({
        success: false,
        field: "currency",
        message: "Currency must be AUD or USD",
      });
    }

    /** Normalize GST */
    gst = gst === true || gst === 1 || gst === "1" ? 1 : 0;

    // Insert
    const [r] = await pool.query(
      "INSERT INTO customers (name, email, web_address, code, salesperson_id, currency, gst) VALUES (?, CAST(? AS JSON), ?, ?, ?, ?, ?)",
      [
        name,
        JSON.stringify(email),
        web_address,
        code,
        salesperson_id || null,
        currency,
        gst,
      ],
    );

    const [rows] = await pool.query("SELECT * FROM customers WHERE id=?", [
      r.insertId,
    ]);

    return res.status(201).json({ success: true, data: rows[0] });
  } catch (err) {
    // Duplicate errors
    if (err.code === "ER_DUP_ENTRY") {
      const msg = (err.sqlMessage || "").toLowerCase();

      if (msg.includes("uniq_customer_code_name")) {
        return res.status(409).json({
          success: false,
          field: "code",
          message: "Customer with this code and name already exists",
        });
      }

      if (msg.includes("uniq_customer_email")) {
        return res.status(409).json({
          success: false,
          field: "email",
          message: "Email already exists",
        });
      }
    }

    return res.status(409).json({
      success: false,
      message: "Duplicate entry",
    });
  }
}

/** READ: list with optional search + pagination */
export async function listCustomers(req, res) {
  try {
    const ok = hasPermission(req, ["readAny", "readOwn"], "customer");

    if (!ok) {
      return res.status(403).json({
        success: false,
        message: "Forbidden: insufficient permissions",
      });
    }

    const q = (req.query.q || "").trim();
    const limit = Math.min(parseInt(req.query.limit || "50", 10), 200);
    const page = Math.max(parseInt(req.query.page || "1", 10), 1);
    const offset = (page - 1) * limit;

    let rows, countRows;

    if (q) {
      const like = `%${q}%`;

      [rows] = await pool.query(
        `SELECT 
        c.*, 
        u.name AS salesperson_name,
        u.short_form AS salesperson_short_form
     FROM customers c
     LEFT JOIN users u ON u.id = c.salesperson_id
     WHERE 
        c.name LIKE ?
        OR c.web_address LIKE ?
        OR c.code LIKE ?
        OR u.name LIKE ?
        OR u.short_form LIKE ?
        OR JSON_SEARCH(c.email, 'one', ?, NULL, '$[*]') IS NOT NULL
     ORDER BY c.name ASC
     LIMIT ? OFFSET ?`,
        [like, like, like, like, like, like, limit, offset],
      );

      [countRows] = await pool.query(
        `SELECT COUNT(*) as total
        FROM customers c
        LEFT JOIN users u ON u.id = c.salesperson_id
        WHERE 
          c.name LIKE ?
          OR c.web_address LIKE ?
          OR c.code LIKE ?
          OR u.name LIKE ?
          OR u.short_form LIKE ?
          OR JSON_SEARCH(c.email, 'one', ?, NULL, '$[*]') IS NOT NULL`,
        [like, like, like, like, like, like],
      );
    } else {
      [rows] = await pool.query(
        `SELECT 
            c.*, 
            u.name AS salesperson_name,
            u.short_form AS salesperson_short_form
         FROM customers c
         LEFT JOIN users u ON u.id = c.salesperson_id
         ORDER BY c.name ASC
         LIMIT ? OFFSET ?`,
        [limit, offset],
      );

      [countRows] = await pool.query(`SELECT COUNT(*) as total FROM customers`);
    }

    return res.json({
      success: true,
      data: rows,
      page,
      limit,
      total: countRows[0].total,
      total_pages: Math.ceil(countRows[0].total / limit),
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

/** READ: one */
export async function getCustomerById(req, res) {
  try {
    const ok = hasPermission(req, ["readAny", "readOwn"], "customer");

    if (!ok) {
      return res.status(403).json({
        success: false,
        message: "Forbidden: insufficient permissions",
      });
    }

    const id = Number(req.params.id);
    const [rows] = await pool.query(
      `SELECT 
          c.*,
          u.name AS salesperson_name,
          u.short_form AS salesperson_short_form
       FROM customers c
       LEFT JOIN users u ON u.id = c.salesperson_id
       WHERE c.id = ?`,
      [id],
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Customer not found",
      });
    }

    const customer = rows[0];
    if (customer.email) {
      try {
        customer.email = JSON.parse(customer.email);
      } catch {}
    }

    res.json({
      success: true,
      data: customer,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

/** UPDATE */
export async function updateCustomer(req, res) {
  try {
    const ok = hasPermission(req, "updateAny", "customer");

    if (!ok) {
      return res.status(403).json({
        success: false,
        message: "Forbidden: insufficient permissions",
      });
    }

    const id = Number(req.params.id);
    const [exists] = await pool.query("SELECT * FROM customers WHERE id=?", [
      id,
    ]);

    if (!exists.length)
      return res
        .status(404)
        .json({ success: false, message: "Customer not found" });

    let { name, email, web_address, code, salesperson_id, currency, gst } =
      req.body || {};
    const updates = [];
    const params = [];

    // sanitize
    if (name !== undefined) name = String(name).trim();
    if (web_address !== undefined) web_address = String(web_address).trim();
    if (code !== undefined) code = code == null ? null : String(code).trim();

    // name
    if (name !== undefined) {
      updates.push("name=?");
      params.push(name);
    }

    // email (JSON)
    if (email !== undefined) {
      if (!Array.isArray(email)) {
        email = String(email)
          .split(",")
          .map((e) => e.trim().toLowerCase())
          .filter(Boolean);
      }
      updates.push("email=CAST(? AS JSON)");
      params.push(JSON.stringify(email));
    }

    // web_address
    if (web_address !== undefined) {
      updates.push("web_address=?");
      params.push(web_address);
    }

    // code
    if (code !== undefined) {
      updates.push("code=?");
      params.push(code);
    }

    // ⭐ NEW — salesperson_id
    if (salesperson_id !== undefined) {
      updates.push("salesperson_id=?");
      params.push(salesperson_id || null); // allow null
    }

    /** currency */
    if (currency !== undefined) {
      currency = String(currency).toUpperCase();
      if (!["AUD", "USD"].includes(currency)) {
        return res.status(400).json({
          success: false,
          field: "currency",
          message: "Currency must be AUD or USD",
        });
      }
      updates.push("currency=?");
      params.push(currency);
    }

    /** gst */
    if (gst !== undefined) {
      gst = gst === true || gst === 1 || gst === "1" ? 1 : 0;
      updates.push("gst=?");
      params.push(gst);
    }

    if (!updates.length) {
      return res
        .status(400)
        .json({ success: false, message: "No valid fields to update" });
    }

    params.push(id);
    await pool.query(
      `UPDATE customers SET ${updates.join(", ")} WHERE id=?`,
      params,
    );

    // return updated with salesperson info
    const [rows] = await pool.query(
      `SELECT 
          c.*, 
          u.name AS salesperson_name,
          u.short_form AS salesperson_short_form
       FROM customers c
       LEFT JOIN users u ON u.id = c.salesperson_id
       WHERE c.id = ?`,
      [id],
    );

    return res.json({ success: true, data: rows[0] });
  } catch (err) {
    if (err.code === "ER_DUP_ENTRY") {
      const msg = (err.sqlMessage || "").toLowerCase();

      if (msg.includes("uniq_customer_code_name")) {
        return res.status(409).json({
          success: false,
          field: "code",
          message: "Customer with this code and name already exists",
        });
      }

      return res.status(409).json({
        success: false,
        message: "Duplicate entry",
      });
    }
  }
}

/** DELETE */
export async function deleteCustomer(req, res) {
  try {
    const ok = hasPermission(req, "deleteAny", "customer");

    if (!ok) {
      return res.status(403).json({
        success: false,
        message: "Forbidden: insufficient permissions",
      });
    }

    const id = Number(req.params.id);
    const [rows] = await pool.query("SELECT * FROM customers WHERE id=?", [id]);
    if (!rows.length)
      return res
        .status(404)
        .json({ success: false, message: "Customer not found" });

    await pool.query("DELETE FROM customers WHERE id=?", [id]);
    res.json({ success: true, message: "Customer deleted" });
  } catch (err) {
    if (err.code === "ER_ROW_IS_REFERENCED_2") {
      return res.status(409).json({
        success: false,
        message: "Cannot delete: Customer is referenced by RFQs",
      });
    }
    res.status(500).json({ success: false, message: err.message });
  }
}
