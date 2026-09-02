import * as XLSX from "xlsx";
import { pool } from "../lib/dbconnect-mysql.js";

export async function replaceCablePrices({
  vendorCode,
  fileName,
  currency,
  uploadedBy,
  items,
}) {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    await connection.query(
      `
        DELETE FROM cable_prices
        WHERE vendor_code = ?
      `,
      [vendorCode],
    );

    if (!items.length) {
      throw new Error("No cable prices were found in the uploaded workbook.");
    }

    const chunkSize = 500;

    for (let start = 0; start < items.length; start += chunkSize) {
      const chunk = items.slice(start, start + chunkSize);

      const placeholders = chunk
        .map(() => "(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)")
        .join(", ");

      const params = [];

      for (const item of chunk) {
        params.push(
          vendorCode,
          item.cable_standard,
          item.section_name || null,
          item.description,
          item.color_name || null,
          item.unit_price,
          currency,
          item.price_basis || null,
          item.packing_roll || null,
          item.moq || null,
          fileName,
          item.sheet_name,
          item.source_row || null,
          uploadedBy || null,
        );
      }

      await connection.query(
        `
        INSERT INTO cable_prices (
          vendor_code,
          cable_standard,
          section_name,
          description,
          color_name,
          unit_price,
          currency,
          price_basis,
          packing_roll,
          moq,
          file_name,
          sheet_name,
          source_row,
          imported_by
        )
        VALUES ${placeholders}
      `,
        params,
      );
    }

    await connection.commit();

    return {
      importedRows: items.length,
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function searchCablePrices({
  vendorCode = "3F",
  cableStandard,
  awg = null,
  colorNames = [],
  query,
  limit = 100,
}) {
  const where = ["vendor_code = ?"];
  const params = [vendorCode];

  if (cableStandard) {
    where.push("cable_standard = ?");
    params.push(cableStandard);
  }

  if (awg !== null) {
    where.push(`
      description REGEXP ?
    `);

    params.push(`(^|[^0-9])${awg}[[:space:]]*AWG([^0-9]|$)`);
  }

  if (!cableStandard && !awg && query) {
    where.push(`
      (
        description LIKE ?
        OR section_name LIKE ?
        OR cable_standard LIKE ?
      )
    `);

    params.push(`%${query}%`, `%${query}%`, `%${query}%`);
  }

  let colorOrderSql = "";

  if (colorNames.length) {
    const colorConditions = [];

    for (const color of colorNames) {
      colorConditions.push(`
        (
          LOWER(description) LIKE ?
          OR LOWER(COALESCE(color_name, '')) LIKE ?
        )
      `);

      params.push(
        `%${String(color).toLowerCase()}%`,
        `%${String(color).toLowerCase()}%`,
      );
    }

    colorOrderSql = `
      CASE
        WHEN ${colorConditions.join(" OR ")}
        THEN 0
        ELSE 1
      END,
    `;
  }

  params.push(limit);

  const [rows] = await pool.query(
    `
      SELECT
        id,
        vendor_code,
        cable_standard,
        section_name,
        description,
        color_name,
        unit_price,
        currency,
        price_basis,
        packing_roll,
        moq,
        file_name,
        sheet_name,
        source_row,
        imported_at

      FROM cable_prices

      WHERE ${where.join(" AND ")}

      ORDER BY
        ${colorOrderSql}
        cable_standard ASC,
        description ASC
      LIMIT ?
    `,
    params,
  );

  return rows;
}

export async function analyzeCablePriceWorkbook(req, res) {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Excel file is required.",
      });
    }

    const workbook = XLSX.read(req.file.buffer, {
      type: "buffer",
      cellStyles: true,
      cellDates: false,
    });

    if (!workbook.SheetNames.length) {
      return res.status(400).json({
        success: false,
        message: "Workbook contains no worksheets.",
      });
    }

    const sheets = [];

    for (const sheetName of workbook.SheetNames) {
      const sheet = workbook.Sheets[sheetName];

      if (!sheet) {
        continue;
      }

      const rows = XLSX.utils.sheet_to_json(sheet, {
        header: 1,
        defval: "",
        raw: false,
        blankrows: true,
      });

      const yellowColumns = detectYellowPriceColumns(sheet);

      const priceRangeColumns = detectPriceRangeColumns(rows);

      const suggestedPriceColumn =
        yellowColumns.length > 0 ? yellowColumns[0].column : null;

      const columns = buildSheetColumns(rows);

      sheets.push({
        sheet_name: sheetName,
        yellow_columns: yellowColumns,
        price_range_columns: priceRangeColumns,
        suggested_price_column: suggestedPriceColumn,
        requires_price_column_selection: !suggestedPriceColumn,
        columns,
        preview_rows: createSheetPreview(rows),
      });
    }

    const requiresSelection = sheets.some(
      (sheet) => !sheet.suggested_price_column,
    );

    return res.json({
      success: true,

      data: {
        file_name: req.file.originalname,

        requires_price_column_selection: requiresSelection,

        sheets,
      },
    });
  } catch (error) {
    console.error("Cable workbook analysis error:", error);

    return res.status(500).json({
      success: false,
      message: error.message || "Failed to analyze cable price workbook.",
    });
  }
}

function normalizeColumnHeader(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[()]/g, " ")
    .replace(/[\\/_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function detectColumnByHeader(rows, candidates, maxRows = 60) {
  const normalizedCandidates = candidates.map((candidate) =>
    normalizeColumnHeader(candidate),
  );

  for (
    let rowIndex = 0;
    rowIndex < Math.min(rows.length, maxRows);
    rowIndex++
  ) {
    const row = rows[rowIndex] || [];

    for (let colIndex = 0; colIndex < row.length; colIndex++) {
      const value = normalizeColumnHeader(row[colIndex]);

      if (!value) {
        continue;
      }

      const matched = normalizedCandidates.some(
        (candidate) => value === candidate || value.includes(candidate),
      );

      if (matched) {
        return XLSX.utils.encode_col(colIndex);
      }
    }
  }

  return null;
}

function buildSheetColumns(rows) {
  const maxColumns = Math.max(0, ...rows.map((row) => row.length));

  const columns = [];

  for (let col = 0; col < maxColumns; col++) {
    const letter = XLSX.utils.encode_col(col);

    const labels = [];

    /**
     * Look through the beginning of the sheet for useful
     * heading/range information.
     */
    for (let rowIndex = 0; rowIndex < Math.min(rows.length, 40); rowIndex++) {
      const value = cleanText(rows[rowIndex]?.[col]);

      if (!value) {
        continue;
      }

      if (!labels.includes(value)) {
        labels.push(value);
      }

      if (labels.length >= 5) {
        break;
      }
    }

    columns.push({
      column: letter,

      label: labels.join(" / ") || `Column ${letter}`,
    });
  }

  return columns;
}

function createSheetPreview(rows) {
  return rows.slice(0, 60).map((row, rowIndex) => {
    const values = {};

    for (let col = 0; col < row.length; col++) {
      values[XLSX.utils.encode_col(col)] = row[col];
    }

    return {
      row_number: rowIndex + 1,
      values,
    };
  });
}

export async function getCablePriceSummary(vendorCode = "3F") {
  const [[summary]] = await pool.query(
    `
      SELECT
        COUNT(*) AS total_items,
        COUNT(DISTINCT cable_standard) AS total_standards,
        COUNT(DISTINCT sheet_name) AS total_sheets,
        MAX(imported_at) AS imported_at,
        MAX(file_name) AS file_name

      FROM cable_prices

      WHERE vendor_code = ?
    `,
    [vendorCode],
  );

  return summary;
}

const COLOR_CODES = {
  BK: "Black",
  BLK: "Black",

  WH: "White",
  WT: "White",

  RD: "Red",

  GN: "Green",
  GRN: "Green",

  YE: "Yellow",
  YL: "Yellow",

  BU: "Blue",
  BL: "Blue",

  BR: "Brown",
  BN: "Brown",

  GY: "Gray",
  GRY: "Gray",
  GREY: "Gray",

  OR: "Orange",

  PK: "Pink",

  VT: "Violet",
  VI: "Violet",
  PU: "Purple",

  CL: "Clear",
  TR: "Transparent",
};

const KNOWN_COLORS = [
  "black",
  "white",
  "red",
  "green",
  "yellow",
  "blue",
  "brown",
  "gray",
  "grey",
  "orange",
  "pink",
  "violet",
  "purple",
  "clear",
  "transparent",
];

function cleanText(value) {
  return String(value ?? "")
    .trim()
    .replace(/\s+/g, " ");
}

function compactText(value) {
  return cleanText(value).toUpperCase().replace(/\s+/g, "");
}

function parsePrice(value) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const text = String(value)
    .replace(/[$,\s]/g, "")
    .replace(/[^\d.-]/g, "");

  if (!text) {
    return null;
  }

  const number = Number(text);

  if (!Number.isFinite(number)) {
    return null;
  }

  if (number <= 0) {
    return null;
  }

  return number;
}

function extractCableStandard(value) {
  const text = String(value || "");

  const match = text.match(/\bUL\s*[- ]?(\d{3,5})\b/i);

  if (!match) {
    return null;
  }

  return `UL${match[1]}`;
}

function extractColors(description) {
  const text = String(description || "").toLowerCase();

  const colors = [];

  for (const color of KNOWN_COLORS) {
    const regex = new RegExp(`\\b${color}\\b`, "i");

    if (!regex.test(text)) {
      continue;
    }

    let normalized = color;

    if (color === "grey") {
      normalized = "gray";
    }

    const display = normalized.charAt(0).toUpperCase() + normalized.slice(1);

    if (!colors.includes(display)) {
      colors.push(display);
    }
  }

  return colors;
}

function normalizeRgb(value) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  // Some XLS parsers may give numeric RGB values.
  if (typeof value === "number") {
    return value.toString(16).padStart(6, "0").slice(-6).toUpperCase();
  }

  let rgb = String(value).replace(/^#/, "").trim().toUpperCase();

  // ARGB -> RGB
  if (rgb.length === 8) {
    rgb = rgb.slice(-6);
  }

  return rgb;
}

function getCellFillInfo(cell) {
  if (!cell) {
    return {
      rgb: null,
      index: null,
      patternType: null,
    };
  }

  const style = typeof cell.s === "object" ? cell.s : {};
  const fill = style?.fill || cell?.fill || {};
  const fgColor = fill?.fgColor || style?.fgColor || {};
  const bgColor = fill?.bgColor || style?.bgColor || {};

  const rgb = normalizeRgb(
    fgColor?.rgb ??
      fgColor?.argb ??
      style?.fgColor?.rgb ??
      bgColor?.rgb ??
      bgColor?.argb,
  );

  const index =
    fgColor?.indexed ??
    fgColor?.index ??
    bgColor?.indexed ??
    bgColor?.index ??
    style?.fgColor?.indexed ??
    style?.fgColor?.index ??
    null;

  const patternType = fill?.patternType ?? style?.patternType ?? null;

  return {
    rgb,
    index: index !== null && index !== undefined ? Number(index) : null,
    patternType,
  };
}

function isYellowRgb(rgb) {
  if (!rgb) {
    return false;
  }

  const exactYellowColors = [
    "FFFF00", // standard Excel yellow
    "FFF200",
    "FFEB9C",
    "FFF2CC",
    "FFD966",
    "FFFF99",
    "FFFFCC",
    "FCE883",
    "FFEA00",
  ];

  if (exactYellowColors.includes(rgb)) {
    return true;
  }

  if (!/^[0-9A-F]{6}$/.test(rgb)) {
    return false;
  }

  const r = parseInt(rgb.slice(0, 2), 16);
  const g = parseInt(rgb.slice(2, 4), 16);
  const b = parseInt(rgb.slice(4, 6), 16);

  return r >= 200 && g >= 180 && b <= 140;
}

function isYellowCell(cell) {
  const { rgb, index } = getCellFillInfo(cell);

  if (isYellowRgb(rgb)) {
    return true;
  }

  const yellowIndexes = [5, 6, 13, 36, 43, 44];

  if (index !== null && yellowIndexes.includes(index)) {
    return true;
  }

  return false;
}

function detectYellowPriceColumns(sheet) {
  if (!sheet["!ref"]) {
    return [];
  }

  const range = XLSX.utils.decode_range(sheet["!ref"]);
  const detected = new Map();

  for (let row = range.s.r; row <= range.e.r; row++) {
    for (let col = range.s.c; col <= range.e.c; col++) {
      const address = XLSX.utils.encode_cell({
        r: row,
        c: col,
      });

      const cell = sheet[address];

      if (!cell) {
        continue;
      }

      if (!isYellowCell(cell)) {
        continue;
      }

      const column = XLSX.utils.encode_col(col);

      if (!detected.has(column)) {
        detected.set(column, {
          column,
          yellow_cells: 0,
          cells: [],
          values: [],
        });
      }

      const item = detected.get(column);
      item.yellow_cells += 1;
      item.cells.push(address);
      if (cell.v !== undefined && cell.v !== null && String(cell.v).trim()) {
        item.values.push(String(cell.v).trim());
      }
    }
  }

  return [...detected.values()].sort((a, b) => b.yellow_cells - a.yellow_cells);
}

function detectPriceRangeColumns(rows) {
  const candidates = [];

  for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
    const row = rows[rowIndex] || [];

    for (let colIndex = 0; colIndex < row.length; colIndex++) {
      const value = cleanText(row[colIndex]);

      if (!value) {
        continue;
      }
      const isRange = /^\s*\d[\d,.]*\s*[-–—]\s*\d[\d,.]*\s*$/.test(value);

      if (!isRange) {
        continue;
      }

      let hasPriceBelow = false;

      for (
        let nextRow = rowIndex + 1;
        nextRow < Math.min(rows.length, rowIndex + 15);
        nextRow++
      ) {
        const below = cleanText(rows[nextRow]?.[colIndex]);

        if (!below) {
          continue;
        }

        if (/(?:US\$|AU\$|\$)?\s*[\d,.]+/i.test(below)) {
          hasPriceBelow = true;
          break;
        }
      }

      if (!hasPriceBelow) {
        continue;
      }

      candidates.push({
        column: XLSX.utils.encode_col(colIndex),

        range_label: value,

        row_number: rowIndex + 1,
      });
    }
  }

  return candidates.filter(
    (item, index, all) =>
      all.findIndex((other) => other.column === item.column) === index,
  );
}

function detectDescriptionColumn(rows, priceColumn) {
  const priceIndex = priceColumn ? XLSX.utils.decode_col(priceColumn) : -1;

  const maxColumns = Math.max(0, ...rows.map((row) => row.length));

  const scores = [];

  for (let col = 0; col < maxColumns; col++) {
    if (col === priceIndex) {
      continue;
    }

    let score = 0;

    for (let rowIndex = 0; rowIndex < Math.min(rows.length, 250); rowIndex++) {
      const value = cleanText(rows[rowIndex]?.[col]);

      if (!value) {
        continue;
      }

      if (/\bAWG\b/i.test(value)) {
        score += 5;
      }

      if (/\d+\s*\/\s*\d+/i.test(value)) {
        score += 3;
      }

      if (/\btinned\b/i.test(value)) {
        score += 3;
      }

      if (/\bcable\b/i.test(value)) {
        score += 1;
      }

      if (
        /\b(black|white|red|green|yellow|blue|brown|gray|grey|orange|pink|violet)\b/i.test(
          value,
        )
      ) {
        score += 2;
      }

      if (value.length >= 10 && value.length <= 300) {
        score += 0.25;
      }
    }

    scores.push({
      column: XLSX.utils.encode_col(col),
      score,
    });
  }

  scores.sort((a, b) => b.score - a.score);

  if (!scores.length || scores[0].score <= 0) {
    return null;
  }

  return scores[0].column;
}

function getColumnValue(row, columnLetter) {
  const index = XLSX.utils.decode_col(columnLetter);

  return row?.[index] ?? "";
}

function buildPriceBasis(rows, priceColumn) {
  const columnIndex = XLSX.utils.decode_col(priceColumn);

  for (let rowIndex = 0; rowIndex < Math.min(rows.length, 60); rowIndex++) {
    const value = cleanText(rows[rowIndex]?.[columnIndex]);

    if (!value) {
      continue;
    }

    const isPriceRange = /^\d[\d,.\s]*\s*[-–—]\s*\d[\d,.\s]*$/.test(value);

    if (isPriceRange) {
      return value;
    }
  }

  return `Column ${priceColumn}`;
}

function rowToText(row) {
  return cleanText(
    (row || [])
      .map((value) => cleanText(value))
      .filter(Boolean)
      .join(" "),
  );
}

function detectSectionHeading(row) {
  const text = rowToText(row);

  if (!text) {
    return null;
  }

  const standard = extractCableStandard(text);

  if (!standard) {
    return null;
  }

  const populated = (row || []).filter(
    (value) => cleanText(value) !== "",
  ).length;

  const looksLikeHeading =
    populated <= 4 ||
    /\bcable\b/i.test(text) ||
    /\bwire\b/i.test(text) ||
    /\bpvc\b/i.test(text);

  if (!looksLikeHeading) {
    return null;
  }

  return {
    standard,
    sectionName: text,
  };
}

function parseSheet({ sheet, sheetName, priceColumn }) {
  const rows = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    defval: "",
    raw: false,
    blankrows: true,
  });

  if (!rows.length) {
    return {
      items: [],
      priceColumn: null,
      descriptionColumn: null,
      warning: "Worksheet is empty.",
    };
  }

  const descriptionColumn = detectDescriptionColumn(rows, priceColumn);

  const packingColumn = detectColumnByHeader(rows, ["packing roll", "packing"]);

  const moqColumn = detectColumnByHeader(rows, [
    "moq",
    "minimum order quantity",
    "minimum order qty",
  ]);

  if (!descriptionColumn) {
    return {
      items: [],
      priceColumn,
      descriptionColumn: null,
      warning: `Could not identify the cable description column in "${sheetName}".`,
    };
  }

  const priceBasis = buildPriceBasis(rows, priceColumn);

  const items = [];

  let currentStandard = null;
  let currentSection = null;

  for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
    const row = rows[rowIndex] || [];

    const heading = detectSectionHeading(row);

    if (heading) {
      currentStandard = heading.standard;
      currentSection = heading.sectionName;
      continue;
    }

    const description = cleanText(getColumnValue(row, descriptionColumn));

    const price = parsePrice(getColumnValue(row, priceColumn));

    const packingRoll = packingColumn
      ? cleanText(getColumnValue(row, packingColumn))
      : "";

    const moq = moqColumn ? cleanText(getColumnValue(row, moqColumn)) : "";

    if (!description || price === null) {
      continue;
    }

    const rowStandard = extractCableStandard(description) || currentStandard;

    if (!rowStandard) {
      continue;
    }

    if (
      /^product$/i.test(description) ||
      /^description$/i.test(description) ||
      /^unit price/i.test(description)
    ) {
      continue;
    }

    const colors = extractColors(description);

    items.push({
      cable_standard: rowStandard,
      section_name: currentSection || rowStandard,
      description,
      color_name: colors.length ? colors.join(", ") : null,
      unit_price: price,
      price_basis: priceBasis || `Column ${priceColumn}`,
      packing_roll: packingRoll || null,
      moq: moq || null,
      sheet_name: sheetName,
      source_row: rowIndex + 1,
    });
  }

  return {
    items,
    descriptionColumn,
    packingColumn,
    moqColumn,
  };
}

function parseCableSearch(value) {
  const raw = String(value || "").trim();
  const compact = compactText(raw);
  const ulMatch = compact.match(/UL(\d{3,5})/i);
  const cableStandard = ulMatch ? `UL${ulMatch[1]}` : null;
  const awgMatch = compact.match(/(\d{1,3})UL\d{3,5}/i);
  const awg = awgMatch ? Number(awgMatch[1]) : null;
  const vendorMatch = compact.match(/-([A-Z0-9]+)$/);
  const vendorCode = vendorMatch ? vendorMatch[1] : "3F";

  let colorPart = "";

  if (ulMatch) {
    const start = (ulMatch.index || 0) + ulMatch[0].length;
    const end = vendorMatch ? vendorMatch.index : compact.length;
    colorPart = compact.slice(start, end).replace(/[^A-Z/]/g, "");
  }

  const colorCodes = colorPart
    ? colorPart
        .split("/")
        .map((code) => code.trim())
        .filter(Boolean)
    : [];

  const colorNames = colorCodes.map((code) => COLOR_CODES[code] || code);

  return {
    raw,
    vendorCode,
    cableStandard,
    awg,
    colorCodes,
    colorNames,
  };
}

/*
 * POST /api/cable-prices/upload
 */
export async function uploadCablePrices(req, res) {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Excel file is required.",
      });
    }

    const vendorCode = String(req.body.vendor_code || "3F")
      .trim()
      .toUpperCase();

    const currency = String(req.body.currency || "USD")
      .trim()
      .toUpperCase();

    let selectedPriceColumns = {};

    if (req.body.price_columns) {
      try {
        selectedPriceColumns = JSON.parse(req.body.price_columns);
      } catch {
        return res.status(400).json({
          success: false,
          message: "Invalid price column selection.",
        });
      }
    }

    const workbook = XLSX.read(req.file.buffer, {
      type: "buffer",
      cellStyles: true,
      cellDates: false,
    });

    if (!workbook.SheetNames.length) {
      return res.status(400).json({
        success: false,
        message: "Workbook contains no worksheets.",
      });
    }

    const allItems = [];
    const sheets = [];
    const missingPriceColumns = [];

    for (const sheetName of workbook.SheetNames) {
      const sheet = workbook.Sheets[sheetName];

      if (!sheet) {
        continue;
      }

      const yellowColumns = detectYellowPriceColumns(sheet);
      const priceColumn =
        selectedPriceColumns[sheetName] || yellowColumns[0]?.column || null;

      if (!priceColumn) {
        missingPriceColumns.push(sheetName);

        sheets.push({
          sheet_name: sheetName,
          imported_rows: 0,
          price_column: null,
          status: "price_column_required",
        });

        continue;
      }

      const parsed = parseSheet({
        sheet,
        sheetName,
        priceColumn,
      });

      sheets.push({
        sheet_name: sheetName,
        imported_rows: parsed.items.length,
        description_column: parsed.descriptionColumn,
        price_column: priceColumn,
        packing_column: parsed.packingColumn,
        moq_column: parsed.moqColumn,
      });
      sheets.push;
      allItems.push(...parsed.items);
    }

    if (missingPriceColumns.length > 0) {
      return res.status(422).json({
        success: false,
        requires_price_column_selection: true,
        message:
          "Price column selection is required for one or more worksheets.",
        missing_sheets: missingPriceColumns,
        sheets,
      });
    }

    if (!allItems.length) {
      return res.status(400).json({
        success: false,
        message:
          "No cable pricing rows could be detected. Existing data was not changed.",
        sheets,
      });
    }

    const result = await replaceCablePrices({
      vendorCode,
      fileName: req.file.originalname,
      currency,
      uploadedBy: req.user?.id || null,
      items: allItems,
    });

    return res.json({
      success: true,
      message: `${result.importedRows} cable price rows imported successfully.`,
      data: {
        imported_rows: result.importedRows,
        total_sheets: sheets.length,
        sheets,
      },
    });
  } catch (error) {
    console.error("Cable price upload error:", error);

    return res.status(500).json({
      success: false,
      message: error.message || "Failed to import cable price data.",
    });
  }
}

/*
 * GET /api/cable-prices/search?q=AHW18UL1007BK-3F
 */
export async function searchCablePrice(req, res) {
  try {
    const q = String(req.query.q || "").trim();

    if (!q) {
      return res.json({
        success: true,
        parsed: null,
        data: [],
      });
    }

    const parsed = parseCableSearch(q);

    const rows = await searchCablePrices({
      vendorCode: parsed.vendorCode,
      cableStandard: parsed.cableStandard,
      awg: parsed.awg,
      colorNames: parsed.colorNames,
      query: q,
      limit: 100,
    });

    return res.json({
      success: true,
      parsed: {
        input: q,
        vendor_code: parsed.vendorCode,
        cable_standard: parsed.cableStandard,
        awg: parsed.awg,
        color_codes: parsed.colorCodes,
        color_names: parsed.colorNames,
      },

      data: rows,
    });
  } catch (error) {
    console.error("Cable price search error:", error);

    return res.status(500).json({
      success: false,
      message: error.message || "Cable price search failed.",
    });
  }
}

/*
 * GET /api/cable-prices/summary
 */
export async function cablePriceSummary(req, res) {
  try {
    const summary = await getCablePriceSummary("3F");

    return res.json({
      success: true,
      data: summary,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to load cable price summary.",
    });
  }
}
