import XLSX from "xlsx";

import { pool } from "../lib/dbconnect-mysql.js";
import {
  bulkInsert,
  findColumnIndex,
  findHeaderRow,
  normalizePartNumber,
  parsePriceListDate,
  toDecimal,
} from "../utils/buySaleExcel.js";
import { hasPermission } from "../utils/role.js";

function readWorkbook(file) {
  if (!file?.buffer) {
    throw new Error("Excel file is required.");
  }

  return XLSX.read(file.buffer, {
    type: "buffer",
    cellDates: true,
  });
}

function sheetToRows(sheet) {
  return XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    defval: null,
    raw: false,
  });
}

export async function uploadStockList(req, res) {
  const connection = await pool.getConnection();

  try {
    const ok = hasPermission(req, ["createAny", "updateAny"], "buy-sale");

    if (!ok) {
      return res.status(403).json({
        success: false,
        message: "Forbidden: insufficient permissions",
      });
    }

    const sheetName = String(req.body.sheetName || "Kunshan").trim();
    const workbook = readWorkbook(req.file);
    const sheet = workbook.Sheets[sheetName];

    if (!sheet) {
      return res.status(400).json({
        success: false,
        message: `Sheet "${sheetName}" was not found in the workbook.`,
      });
    }

    const rows = sheetToRows(sheet);

    const headerIndex = findHeaderRow(rows, ["Item Number", "Nett Inventory"]);

    if (headerIndex === -1) {
      return res.status(400).json({
        success: false,
        message:
          'The selected sheet must contain "Item Number" and "Nett Inventory" columns.',
      });
    }

    const headers = rows[headerIndex];

    const itemNumberIndex = findColumnIndex(headers, [
      "Item Number",
      "Product Number",
      "Part Number",
    ]);

    const inventoryIndex = findColumnIndex(headers, [
      "Nett Inventory",
      "Net Inventory",
      "Inventory",
    ]);

    const stockRows = [];
    const seenParts = new Set();

    for (const row of rows.slice(headerIndex + 1)) {
      const partNumber = String(row[itemNumberIndex] ?? "").trim();
      const normalizedPartNumber = normalizePartNumber(partNumber);
      const inventory = toDecimal(row[inventoryIndex]);

      if (
        !normalizedPartNumber ||
        normalizedPartNumber === "TOTAL" ||
        inventory === null
      ) {
        continue;
      }

      if (seenParts.has(normalizedPartNumber)) {
        continue;
      }

      seenParts.add(normalizedPartNumber);

      stockRows.push([partNumber, normalizedPartNumber, inventory, sheetName]);
    }

    if (!stockRows.length) {
      return res.status(400).json({
        success: false,
        message: "No valid stock rows were found.",
      });
    }

    await connection.beginTransaction();

    await connection.query(
      `DELETE FROM pem_stock
       WHERE stock_location = ?`,
      [sheetName],
    );

    await bulkInsert(
      connection,
      `
      INSERT INTO pem_stock (
        part_number,
        normalized_part_number,
        nett_inventory,
        stock_location
      )
      `,
      stockRows,
      4,
    );

    await connection.commit();

    return res.json({
      success: true,
      message: `${stockRows.length} stock items imported successfully.`,
      data: {
        imported_rows: stockRows.length,
        sheet_name: sheetName,
      },
    });
  } catch (error) {
    await connection.rollback();

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  } finally {
    connection.release();
  }
}

export async function uploadPartMappings(req, res) {
  const connection = await pool.getConnection();

  try {
    const ok = hasPermission(req, ["createAny", "updateAny"], "buy-sale");

    if (!ok) {
      return res.status(403).json({
        success: false,
        message: "Forbidden: insufficient permissions",
      });
    }

    const workbook = readWorkbook(req.file);
    const firstSheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[firstSheetName];
    const rows = sheetToRows(sheet);

    const headerIndex = rows.findIndex((row) => {
      const captiveIndex = findColumnIndex(row, [
        "Captive",
        "Captive Part",
        "Captive P/N",
        "Captive Part Number",
      ]);

      const pemIndex = findColumnIndex(row, [
        "PEM",
        "PEM Part",
        "PEM P/N",
        "PEM Part Number",
      ]);

      return captiveIndex !== -1 && pemIndex !== -1;
    });

    if (headerIndex === -1) {
      return res.status(400).json({
        success: false,
        message: "Captive and PEM part-number columns were not found.",
      });
    }

    const headers = rows[headerIndex];

    const captiveIndex = findColumnIndex(headers, [
      "Captive",
      "Captive Part",
      "Captive P/N",
      "Captive Part Number",
    ]);

    const pemIndex = findColumnIndex(headers, [
      "PEM",
      "PEM Part",
      "PEM P/N",
      "PEM Part Number",
    ]);

    const descriptionIndex = findColumnIndex(headers, [
      "Description",
      "Item Description",
    ]);

    const mappingRows = [];
    const seenCaptiveParts = new Set();

    for (const row of rows.slice(headerIndex + 1)) {
      const captivePartNumber = String(row[captiveIndex] ?? "").trim();

      const pemPartNumber = String(row[pemIndex] ?? "").trim();

      const normalizedCaptivePartNumber =
        normalizePartNumber(captivePartNumber);

      const normalizedPemPartNumber = normalizePartNumber(pemPartNumber);

      if (
        !normalizedCaptivePartNumber ||
        !normalizedPemPartNumber ||
        seenCaptiveParts.has(normalizedCaptivePartNumber)
      ) {
        continue;
      }

      seenCaptiveParts.add(normalizedCaptivePartNumber);

      mappingRows.push([
        captivePartNumber,
        normalizedCaptivePartNumber,
        pemPartNumber,
        normalizedPemPartNumber,
        descriptionIndex !== -1
          ? String(row[descriptionIndex] ?? "").trim() || null
          : null,
      ]);
    }

    if (!mappingRows.length) {
      return res.status(400).json({
        success: false,
        message: "No valid part mappings were found.",
      });
    }

    await connection.beginTransaction();

    await connection.query(`DELETE FROM part_number_mappings`);

    await bulkInsert(
      connection,
      `
      INSERT INTO part_number_mappings (
        captive_part_number,
        normalized_captive_part_number,
        pem_part_number,
        normalized_pem_part_number,
        description
      )
      `,
      mappingRows,
      5,
    );

    await connection.commit();

    return res.json({
      success: true,
      message: `${mappingRows.length} part mappings imported successfully.`,
      data: {
        imported_rows: mappingRows.length,
      },
    });
  } catch (error) {
    await connection.rollback();

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  } finally {
    connection.release();
  }
}

export async function uploadItemPrices(req, res) {
  const connection = await pool.getConnection();

  try {
    if (!req.file?.buffer) {
      return res.status(400).json({
        success: false,
        message: "Price Excel file is required.",
      });
    }

    const workbook = readWorkbook(req.file);
    const firstSheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[firstSheetName];

    if (!sheet) {
      return res.status(400).json({
        success: false,
        message: "No readable worksheet was found in the Excel file.",
      });
    }

    const rows = sheetToRows(sheet);

    /*
     * This Excel uses two header rows:
     *
     * Product    | Product | PE / Bag | Carton/   | PE / Bag   | Carton/
     * Number     | Family  | Order Qty| Order Qty | Order Price| Order Price
     *
     * We combine both rows before locating columns.
     */
    let firstHeaderRowIndex = -1;
    let secondHeaderRowIndex = -1;
    let combinedHeaders = [];

    for (let index = 0; index < rows.length - 1; index += 1) {
      const firstRow = Array.isArray(rows[index]) ? rows[index] : [];
      const secondRow = Array.isArray(rows[index + 1]) ? rows[index + 1] : [];

      const maximumColumns = Math.max(firstRow.length, secondRow.length);

      const candidateHeaders = [];

      for (
        let columnIndex = 0;
        columnIndex < maximumColumns;
        columnIndex += 1
      ) {
        const firstPart = String(firstRow[columnIndex] ?? "").trim();
        const secondPart = String(secondRow[columnIndex] ?? "").trim();

        candidateHeaders.push(
          `${firstPart} ${secondPart}`.replace(/\s+/g, " ").trim(),
        );
      }

      const productNumberIndex = findColumnIndex(candidateHeaders, [
        "Product Number",
        "Item Number",
        "Part Number",
      ]);

      const productFamilyIndex = findColumnIndex(candidateHeaders, [
        "Product Family",
        "Family",
      ]);

      const bagQuantityIndex = findColumnIndex(candidateHeaders, [
        "PE / Bag Order Qty",
        "PE/Bag Order Qty",
        "PE Bag Order Qty",
      ]);

      const cartonQuantityIndex = findColumnIndex(candidateHeaders, [
        "Carton/ Order Qty",
        "Carton / Order Qty",
        "Carton Order Qty",
        "Carton/Order Qty",
      ]);

      const standardPriceIndex = findColumnIndex(candidateHeaders, [
        "PE / Bag Order Price",
        "PE/Bag Order Price",
        "PE Bag Order Price",
      ]);

      const cartonPriceIndex = findColumnIndex(candidateHeaders, [
        "Carton/ Order Price",
        "Carton / Order Price",
        "Carton Order Price",
        "Carton/Order Price",
      ]);

      if (
        productNumberIndex !== -1 &&
        productFamilyIndex !== -1 &&
        bagQuantityIndex !== -1 &&
        cartonQuantityIndex !== -1 &&
        standardPriceIndex !== -1 &&
        cartonPriceIndex !== -1
      ) {
        firstHeaderRowIndex = index;
        secondHeaderRowIndex = index + 1;
        combinedHeaders = candidateHeaders;
        break;
      }
    }

    if (firstHeaderRowIndex === -1 || secondHeaderRowIndex === -1) {
      return res.status(400).json({
        success: false,
        message:
          "Required two-row price-list headers could not be found. Expected Product Number, Product Family, PE/Bag Order Qty, Carton Order Qty, PE/Bag Order Price and Carton Order Price.",
      });
    }

    const productNumberIndex = findColumnIndex(combinedHeaders, [
      "Product Number",
      "Item Number",
      "Part Number",
    ]);

    const productFamilyIndex = findColumnIndex(combinedHeaders, [
      "Product Family",
      "Family",
    ]);

    const bagQuantityIndex = findColumnIndex(combinedHeaders, [
      "PE / Bag Order Qty",
      "PE/Bag Order Qty",
      "PE Bag Order Qty",
    ]);

    const cartonQuantityIndex = findColumnIndex(combinedHeaders, [
      "Carton/ Order Qty",
      "Carton / Order Qty",
      "Carton Order Qty",
      "Carton/Order Qty",
    ]);

    const standardPriceIndex = findColumnIndex(combinedHeaders, [
      "PE / Bag Order Price",
      "PE/Bag Order Price",
      "PE Bag Order Price",
    ]);

    const cartonPriceIndex = findColumnIndex(combinedHeaders, [
      "Carton/ Order Price",
      "Carton / Order Price",
      "Carton Order Price",
      "Carton/Order Price",
    ]);

    const priceListDate = parsePriceListDate(rows);
    const priceRows = [];
    const seenProducts = new Set();

    // Data begins after the second header row.
    const dataRows = rows.slice(secondHeaderRowIndex + 1);

    for (const row of dataRows) {
      if (!Array.isArray(row)) {
        continue;
      }

      const productNumber = String(row[productNumberIndex] ?? "").trim();

      const normalizedProductNumber = normalizePartNumber(productNumber);

      if (!normalizedProductNumber) {
        continue;
      }

      if (seenProducts.has(normalizedProductNumber)) {
        continue;
      }

      const productFamily =
        productFamilyIndex !== -1
          ? String(row[productFamilyIndex] ?? "").trim() || null
          : null;

      const bagQuantity = toDecimal(row[bagQuantityIndex]);
      const cartonQuantity = toDecimal(row[cartonQuantityIndex]);

      /*
       * Both prices in this PEM file are prices per 1,000 pieces.
       *
       * Example:
       * Bag quantity: 500
       * PE/Bag order price: $803.75
       *
       * Unit price is $803.75 / 1,000, not $803.75 / 500.
       */
      const standardPricePer1000 = toDecimal(row[standardPriceIndex]);

      const cartonPricePer1000 = toDecimal(row[cartonPriceIndex]);

      if (standardPricePer1000 === null && cartonPricePer1000 === null) {
        continue;
      }

      seenProducts.add(normalizedProductNumber);

      priceRows.push([
        productNumber,
        normalizedProductNumber,
        productFamily,
        bagQuantity,
        cartonQuantity,
        standardPricePer1000,
        cartonPricePer1000,
        priceListDate,
      ]);
    }

    if (!priceRows.length) {
      return res.status(400).json({
        success: false,
        message:
          "The headers were found, but no valid item-price rows were found.",
      });
    }

    await connection.beginTransaction();

    await connection.query(`
      DELETE FROM pem_item_prices
    `);

    await bulkInsert(
      connection,
      `
      INSERT INTO pem_item_prices (
        product_number,
        normalized_product_number,
        product_family,
        bag_quantity,
        carton_quantity,
        standard_price_per_1000,
        carton_price_per_1000,
        price_list_date
      )
      `,
      priceRows,
      8,
    );

    await connection.commit();

    return res.json({
      success: true,
      message: `${priceRows.length} item prices imported successfully.`,
      data: {
        imported_rows: priceRows.length,
        worksheet: firstSheetName,
        price_list_date: priceListDate,
      },
    });
  } catch (error) {
    try {
      await connection.rollback();
    } catch {
      // Transaction may not have started yet.
    }

    console.error("Price Excel upload error:", error);

    return res.status(500).json({
      success: false,
      message: error.message || "Failed to import the price Excel file.",
    });
  } finally {
    connection.release();
  }
}

export async function lookupBuySalePart(req, res) {
  try {
    const ok = hasPermission(req, ["readAny", "readOwn"], "buy-sale");

    if (!ok) {
      return res.status(403).json({
        success: false,
        message: "Forbidden: insufficient permissions",
      });
    }

    const enteredPartNumber = String(req.query.partNumber || "").trim();

    const stockLocation = String(req.query.location || "Kunshan").trim();

    if (!enteredPartNumber) {
      return res.status(400).json({
        success: false,
        message: "Part number is required.",
      });
    }

    const normalizedEnteredPartNumber = normalizePartNumber(enteredPartNumber);

    const [directRows] = await pool.query(
      `
      SELECT
        part_number,
        normalized_part_number
      FROM pem_stock
      WHERE normalized_part_number = ?
      LIMIT 1
      `,
      [normalizedEnteredPartNumber],
    );

    let matchType = "direct";
    let ampecPartNumber = enteredPartNumber;
    let normalizedAmpecPartNumber = normalizedEnteredPartNumber;
    let customerPartNumber = "";
    let description = "";

    if (!directRows.length) {
      const [mappingRows] = await pool.query(
        `
        SELECT
          captive_part_number,
          normalized_captive_part_number,
          pem_part_number,
          normalized_pem_part_number,
          description
        FROM part_number_mappings
        WHERE normalized_captive_part_number = ?
        LIMIT 1
        `,
        [normalizedEnteredPartNumber],
      );

      if (!mappingRows.length) {
        return res.status(404).json({
          success: false,
          message:
            "Part number was not found in stock or alternative part mapping.",
        });
      }

      const mapping = mappingRows[0];

      matchType = "mapping";
      ampecPartNumber = mapping.pem_part_number;
      normalizedAmpecPartNumber = mapping.normalized_pem_part_number;
      customerPartNumber = mapping.captive_part_number;
      description = mapping.description || "";
    } else {
      ampecPartNumber = directRows[0].part_number;

      const [descriptionRows] = await pool.query(
        `
        SELECT
          captive_part_number,
          description
        FROM part_number_mappings
        WHERE normalized_pem_part_number = ?
        ORDER BY id ASC
        LIMIT 1
        `,
        [normalizedAmpecPartNumber],
      );

      if (descriptionRows.length) {
        description = descriptionRows[0].description || "";
      }
    }

    const [stockRows] = await pool.query(
      `
      SELECT
        part_number,
        nett_inventory,
        stock_location
      FROM pem_stock
      WHERE normalized_part_number = ?
        AND stock_location = ?
      LIMIT 1
      `,
      [normalizedAmpecPartNumber, stockLocation],
    );

    const [priceRows] = await pool.query(
      `
        SELECT
          product_number,
          product_family,
          bag_quantity,
          carton_quantity,
          standard_price_per_1000,
          carton_price_per_1000,
          price_list_date
        FROM pem_item_prices
        WHERE normalized_product_number = ?
        LIMIT 1
      `,
      [normalizedAmpecPartNumber],
    );

    const stock = stockRows[0] || null;
    const price = priceRows[0] || null;

    const bagQuantity =
      price?.bag_quantity !== null && price?.bag_quantity !== undefined
        ? Number(price.bag_quantity)
        : null;

    const cartonQuantity =
      price?.carton_quantity !== null && price?.carton_quantity !== undefined
        ? Number(price.carton_quantity)
        : null;

    const standardPricePer1000 =
      price?.standard_price_per_1000 !== null &&
      price?.standard_price_per_1000 !== undefined
        ? Number(price.standard_price_per_1000)
        : null;

    const cartonPricePer1000 =
      price?.carton_price_per_1000 !== null &&
      price?.carton_price_per_1000 !== undefined
        ? Number(price.carton_price_per_1000)
        : null;

    // Both Excel prices represent the price for 1,000 pieces.
    const standardUnitPrice =
      standardPricePer1000 !== null ? standardPricePer1000 / 1000 : null;

    const cartonUnitPrice =
      cartonPricePer1000 !== null ? cartonPricePer1000 / 1000 : null;

    return res.json({
      success: true,
      data: {
        enteredPartNumber,
        ampecPartNumber,
        customerPartNumber,
        description,
        matchType,

        stockQuantity: stock ? Number(stock.nett_inventory) : 0,

        stockLocation: stock ? stock.stock_location : stockLocation,

        bagQuantity,
        cartonQuantity,

        standardPricePer1000,
        cartonPricePer1000,

        standardUnitPrice,
        cartonUnitPrice,

        priceListDate: price?.price_list_date || null,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
}
