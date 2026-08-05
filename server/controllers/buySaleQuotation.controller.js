import { pool } from "../lib/dbconnect-mysql.js";
import { hasPermission } from "../utils/role.js";

function numberOrZero(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export async function saveBuySaleQuotation(req, res) {
  const ok = hasPermission(req, ["createAny", "createOwn"], "buy-sale");

  if (!ok) {
    return res.status(403).json({
      success: false,
      message: "Forbidden: insufficient permissions",
    });
  }

  const connection = await pool.getConnection();

  try {
    const { lines } = req.body;

    if (!Array.isArray(lines) || lines.length === 0) {
      return res.status(400).json({
        success: false,
        message: "At least one quotation item is required.",
      });
    }

    const validLines = lines.filter((line) => {
      return (
        String(line.ampecPartNumber || "").trim() ||
        String(line.customerPartNumber || "").trim() ||
        String(line.description || "").trim()
      );
    });

    if (!validLines.length) {
      return res.status(400).json({
        success: false,
        message: "No valid quotation items were provided.",
      });
    }

    const values = validLines.map((line) => [
      String(line.ampecPartNumber || "").trim() || null,
      String(line.customerPartNumber || "").trim() || null,
      String(line.description || "").trim() || null,

      numberOrZero(line.requiredQuantity),
      numberOrZero(line.finalUnitPriceAud),

      String(line.leadTime || "").trim() || null,
      String(line.ncnr || "").trim() || null,
      String(line.remark || "").trim() || null,
    ]);

    const placeholders = values
      .map(() => "(?, ?, ?, ?, ?, ?, ?, ?)")
      .join(", ");

    await connection.beginTransaction();

    const [result] = await connection.query(
      `
      INSERT INTO buy_sale_quotations (
        ampec_part_number,
        customer_part_number,
        description,
        quantity,
        unit_price_aud_ex_gst,
        lead_time,
        ncnr,
        remark
      )
      VALUES ${placeholders}
      `,
      values.flat(),
    );

    await connection.commit();

    return res.status(201).json({
      success: true,
      message: `${validLines.length} quotation item${
        validLines.length === 1 ? "" : "s"
      } saved successfully.`,
      data: {
        inserted_rows: result.affectedRows,
        first_inserted_id: result.insertId,
      },
    });
  } catch (error) {
    try {
      await connection.rollback();
    } catch {
      // Transaction may not have started.
    }

    return res.status(500).json({
      success: false,
      message: error.message || "Unable to save quotation.",
    });
  } finally {
    connection.release();
  }
}
