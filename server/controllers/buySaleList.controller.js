import { pool } from "../lib/dbconnect-mysql.js";

const DEFAULT_LIMIT = 30;
const MAX_LIMIT = 100;

function getLimit(value) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) return DEFAULT_LIMIT;
  return Math.min(parsed, MAX_LIMIT);
}

function escapeLike(value) {
  return String(value).replace(/[\\%_]/g, "\\$&");
}

function decodeItemCursor(value) {
  if (!value) return null;
  try {
    const decoded = Buffer.from(String(value), "base64url").toString("utf8");
    const parsed = JSON.parse(decoded);
    const normalizedPartNumber = String(
      parsed.normalizedPartNumber || "",
    ).trim();
    return normalizedPartNumber ? { normalizedPartNumber } : null;
  } catch {
    return null;
  }
}

function encodeItemCursor(item) {
  return Buffer.from(
    JSON.stringify({ normalizedPartNumber: item.normalized_part_number }),
    "utf8",
  ).toString("base64url");
}

function decodeQuoteCursor(value) {
  if (!value) return null;
  try {
    const decoded = Buffer.from(String(value), "base64url").toString("utf8");
    const parsed = JSON.parse(decoded);
    const id = Number(parsed.id);
    return Number.isInteger(id) && id > 0 ? { id } : null;
  } catch {
    return null;
  }
}

function encodeQuoteCursor(row) {
  return Buffer.from(JSON.stringify({ id: row.id }), "utf8").toString(
    "base64url",
  );
}

function decodeCursor(value) {
  if (!value) {
    return null;
  }

  try {
    const decoded = Buffer.from(String(value), "base64url").toString("utf8");

    const parsed = JSON.parse(decoded);

    const normalizedPartNumber = String(
      parsed.normalizedPartNumber || "",
    ).trim();

    if (!normalizedPartNumber) {
      return null;
    }

    return {
      normalizedPartNumber,
    };
  } catch {
    return null;
  }
}

function encodeCursor(item) {
  return Buffer.from(
    JSON.stringify({
      normalizedPartNumber: item.normalized_part_number,
    }),
    "utf8",
  ).toString("base64url");
}

export async function getBuySaleItems(req, res) {
  try {
    const limit = getLimit(req.query.limit);
    const cursor = decodeCursor(req.query.cursor);
    const search = String(req.query.search || "").trim();

    /*
     * This CTE creates one unique record for every normalized
     * PEM/item part number found in mapping, price or stock.
     */
    const itemDataSql = `
      WITH
      all_items AS (
        SELECT
          normalized_pem_part_number AS normalized_part_number
        FROM part_number_mappings
        WHERE normalized_pem_part_number IS NOT NULL
          AND normalized_pem_part_number <> ''

        UNION

        SELECT
          normalized_product_number AS normalized_part_number
        FROM pem_item_prices
        WHERE normalized_product_number IS NOT NULL
          AND normalized_product_number <> ''

        UNION

        SELECT
          normalized_part_number
        FROM pem_stock
        WHERE normalized_part_number IS NOT NULL
          AND normalized_part_number <> ''
      ),

      mapping_data AS (
        SELECT
          normalized_pem_part_number,

          MAX(pem_part_number) AS pem_part_number,

          GROUP_CONCAT(
            DISTINCT captive_part_number
            ORDER BY captive_part_number
            SEPARATOR ', '
          ) AS captive_part_numbers,

          GROUP_CONCAT(
            DISTINCT NULLIF(description, '')
            ORDER BY description
            SEPARATOR ' | '
          ) AS description

        FROM part_number_mappings
        GROUP BY normalized_pem_part_number
      ),

      price_data AS (
        SELECT
          normalized_product_number,

          MAX(product_number) AS product_number,
          MAX(product_family) AS product_family,

          MAX(bag_quantity) AS bag_quantity,
          MAX(carton_quantity) AS carton_quantity,

          MAX(standard_price_per_1000)
            AS standard_price_per_1000,

          MAX(carton_price_per_1000)
            AS carton_price_per_1000,

          MAX(price_list_date) AS price_list_date

        FROM pem_item_prices
        GROUP BY normalized_product_number
      ),

      stock_data AS (
        SELECT
          normalized_part_number,

          MAX(part_number) AS part_number,

          SUM(
            COALESCE(nett_inventory, 0)
          ) AS nett_inventory,

          GROUP_CONCAT(
            DISTINCT NULLIF(stock_location, '')
            ORDER BY stock_location
            SEPARATOR ', '
          ) AS stock_locations

        FROM pem_stock
        GROUP BY normalized_part_number
      )
    `;

    const searchConditions = [];
    const searchParams = [];

    if (search) {
      const likeSearch = `%${escapeLike(search)}%`;

      searchConditions.push(`
        (
          all_items.normalized_part_number
            LIKE ? ESCAPE '\\\\'

          OR COALESCE(
            mapping_data.pem_part_number,
            ''
          ) LIKE ? ESCAPE '\\\\'

          OR COALESCE(
            mapping_data.captive_part_numbers,
            ''
          ) LIKE ? ESCAPE '\\\\'

          OR COALESCE(
            mapping_data.description,
            ''
          ) LIKE ? ESCAPE '\\\\'

          OR COALESCE(
            price_data.product_number,
            ''
          ) LIKE ? ESCAPE '\\\\'

          OR COALESCE(
            price_data.product_family,
            ''
          ) LIKE ? ESCAPE '\\\\'

          OR COALESCE(
            stock_data.part_number,
            ''
          ) LIKE ? ESCAPE '\\\\'

          OR COALESCE(
            stock_data.stock_locations,
            ''
          ) LIKE ? ESCAPE '\\\\'
        )
      `);

      searchParams.push(
        likeSearch,
        likeSearch,
        likeSearch,
        likeSearch,
        likeSearch,
        likeSearch,
        likeSearch,
        likeSearch,
      );
    }

    const searchWhereSql = searchConditions.length
      ? `WHERE ${searchConditions.join(" AND ")}`
      : "";

    /*
     * Count all records matching the current filter.
     * The infinite-scroll cursor is intentionally not included.
     */
    const [countRows] = await pool.query(
      `
      ${itemDataSql}

      SELECT
        COUNT(*) AS total_count

      FROM all_items

      LEFT JOIN mapping_data
        ON mapping_data.normalized_pem_part_number =
          all_items.normalized_part_number

      LEFT JOIN price_data
        ON price_data.normalized_product_number =
          all_items.normalized_part_number

      LEFT JOIN stock_data
        ON stock_data.normalized_part_number =
          all_items.normalized_part_number

      ${searchWhereSql}
      `,
      searchParams,
    );

    const totalCount = Number(countRows[0]?.total_count || 0);

    /*
     * List query includes the search filter and cursor.
     */
    const listConditions = [...searchConditions];
    const listParams = [...searchParams];

    if (cursor?.normalizedPartNumber) {
      listConditions.push(`
        all_items.normalized_part_number > ?
      `);

      listParams.push(cursor.normalizedPartNumber);
    }

    const listWhereSql = listConditions.length
      ? `WHERE ${listConditions.join(" AND ")}`
      : "";

    listParams.push(limit + 1);

    const [rows] = await pool.query(
      `
      ${itemDataSql}

      SELECT
        all_items.normalized_part_number,

        COALESCE(
          price_data.product_number,
          stock_data.part_number,
          mapping_data.pem_part_number,
          all_items.normalized_part_number
        ) AS item_number,

        mapping_data.pem_part_number,
        mapping_data.captive_part_numbers,
        mapping_data.description,

        price_data.product_family,
        price_data.bag_quantity,
        price_data.carton_quantity,
        price_data.standard_price_per_1000,
        price_data.carton_price_per_1000,
        price_data.price_list_date,

        stock_data.nett_inventory,
        stock_data.stock_locations

      FROM all_items

      LEFT JOIN mapping_data
        ON mapping_data.normalized_pem_part_number =
          all_items.normalized_part_number

      LEFT JOIN price_data
        ON price_data.normalized_product_number =
          all_items.normalized_part_number

      LEFT JOIN stock_data
        ON stock_data.normalized_part_number =
          all_items.normalized_part_number

      ${listWhereSql}

      ORDER BY
        all_items.normalized_part_number ASC

      LIMIT ?
      `,
      listParams,
    );

    const hasMore = rows.length > limit;

    const items = hasMore ? rows.slice(0, limit) : rows;

    const lastItem = items.at(-1);

    return res.json({
      success: true,
      message: "Items loaded successfully.",

      data: {
        items,

        total_count: totalCount,

        next_cursor: hasMore && lastItem ? encodeCursor(lastItem) : null,

        has_more: hasMore,
      },
    });
  } catch (error) {
    console.error("Buy-sale item list error:", error);

    return res.status(500).json({
      success: false,

      message: error.message || "Failed to load the item list.",
    });
  }
}

function decodeQuotationCursor(value) {
  if (!value) {
    return null;
  }

  try {
    const decoded = Buffer.from(String(value), "base64url").toString("utf8");

    const parsed = JSON.parse(decoded);

    const id = Number(parsed.id);

    if (!Number.isInteger(id) || id <= 0) {
      return null;
    }

    return { id };
  } catch {
    return null;
  }
}

function encodeQuotationCursor(row) {
  return Buffer.from(
    JSON.stringify({
      id: row.id,
    }),
    "utf8",
  ).toString("base64url");
}

export async function getSavedBuySaleQuotations(req, res) {
  try {
    const limit = getLimit(req.query.limit);

    const cursor = decodeQuotationCursor(req.query.cursor);

    const search = String(req.query.search || "").trim();

    const searchConditions = [];
    const searchParams = [];

    if (search) {
      const likeSearch = `%${escapeLike(search)}%`;

      searchConditions.push(`
        (
          CAST(id AS CHAR)
            LIKE ? ESCAPE '\\\\'

          OR COALESCE(
            ampec_part_number,
            ''
          ) LIKE ? ESCAPE '\\\\'

          OR COALESCE(
            customer_part_number,
            ''
          ) LIKE ? ESCAPE '\\\\'

          OR COALESCE(
            description,
            ''
          ) LIKE ? ESCAPE '\\\\'

          OR COALESCE(
            lead_time,
            ''
          ) LIKE ? ESCAPE '\\\\'

          OR COALESCE(
            ncnr,
            ''
          ) LIKE ? ESCAPE '\\\\'

          OR COALESCE(
            remark,
            ''
          ) LIKE ? ESCAPE '\\\\'
        )
      `);

      searchParams.push(
        likeSearch,
        likeSearch,
        likeSearch,
        likeSearch,
        likeSearch,
        likeSearch,
        likeSearch,
      );
    }

    const searchWhereSql = searchConditions.length
      ? `WHERE ${searchConditions.join(" AND ")}`
      : "";

    /*
     * Count all rows matching the active filter.
     */
    const [countRows] = await pool.query(
      `
      SELECT
        COUNT(*) AS total_count

      FROM buy_sale_quotations

      ${searchWhereSql}
      `,
      searchParams,
    );

    const totalCount = Number(countRows[0]?.total_count || 0);

    /*
     * Cursor affects only the current infinite-scroll page.
     */
    const listConditions = [...searchConditions];
    const listParams = [...searchParams];

    if (cursor?.id) {
      listConditions.push("id < ?");
      listParams.push(cursor.id);
    }

    const listWhereSql = listConditions.length
      ? `WHERE ${listConditions.join(" AND ")}`
      : "";

    listParams.push(limit + 1);

    const [rows] = await pool.query(
      `
      SELECT
        id,
        ampec_part_number,
        customer_part_number,
        description,
        quantity,
        unit_price_aud_ex_gst,
        lead_time,
        ncnr,
        remark,
        created_at

      FROM buy_sale_quotations

      ${listWhereSql}

      ORDER BY id DESC

      LIMIT ?
      `,
      listParams,
    );

    const hasMore = rows.length > limit;

    const items = hasMore ? rows.slice(0, limit) : rows;

    const lastItem = items.at(-1);

    return res.json({
      success: true,

      message: "Saved quotations loaded successfully.",

      data: {
        items,

        total_count: totalCount,

        next_cursor:
          hasMore && lastItem ? encodeQuotationCursor(lastItem) : null,

        has_more: hasMore,
      },
    });
  } catch (error) {
    console.error("Saved quotation list error:", error);

    return res.status(500).json({
      success: false,

      message: error.message || "Failed to load saved quotations.",
    });
  }
}
