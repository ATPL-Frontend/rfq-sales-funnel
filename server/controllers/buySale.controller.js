import XLSX from "xlsx";

import { pool } from "../lib/dbconnect-mysql.js";
import {
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

    await connection.query(
      `
        INSERT INTO pem_stock (
          part_number,
          normalized_part_number,
          nett_inventory,
          stock_location
        )
        VALUES ?
      `,
      [stockRows],
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

    const mappingValues = rows.map((row) => [
      row.captivePartNumber,
      row.normalizedCaptivePartNumber,
      row.pemPartNumber,
      row.normalizedPemPartNumber,
      row.description || null,
    ]);

    const placeholders = mappingValues.map(() => "(?, ?, ?, ?, ?)").join(", ");

    await connection.query(
      `
      INSERT INTO part_number_mappings (
        captive_part_number,
        normalized_captive_part_number,
        pem_part_number,
        normalized_pem_part_number,
        description
      )
      VALUES ${placeholders}
      AS new
      ON DUPLICATE KEY UPDATE
        captive_part_number =
          new.captive_part_number,

        pem_part_number =
          new.pem_part_number,

        normalized_pem_part_number =
          new.normalized_pem_part_number,

        description =
          new.description,

        updated_at =
          CURRENT_TIMESTAMP
      `,
      mappingValues.flat(),
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
     * The price Excel uses two header rows:
     *
     * Product    | Product | PE / Bag  | Carton/   | PE / Bag    | Carton/
     * Number     | Family  | Order Qty | Order Qty | Order Price | Order Price
     *
     * Combine both rows before locating the required columns.
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

    /*
     * Data starts immediately after the second header row.
     */
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

      /*
       * Ignore duplicate products inside the same Excel file.
       * The first valid occurrence is used.
       */
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
       * Both prices are prices per 1,000 pieces.
       *
       * Example:
       * PE/Bag price: 803.75
       * Unit price: 803.75 / 1,000
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

    /*
     * Do not delete pem_item_prices.
     *
     * Existing products missing from this Excel remain unchanged.
     * Existing matching products are updated.
     * New products are inserted.
     */
    const batchSize = 500;

    let processedRows = 0;
    let affectedRows = 0;

    for (
      let startIndex = 0;
      startIndex < priceRows.length;
      startIndex += batchSize
    ) {
      const batch = priceRows.slice(startIndex, startIndex + batchSize);

      const placeholders = batch
        .map(() => "(?, ?, ?, ?, ?, ?, ?, ?)")
        .join(", ");

      const values = batch.flat();

      const [result] = await connection.query(
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
        VALUES ${placeholders}
        ON DUPLICATE KEY UPDATE
          product_number =
            VALUES(product_number),

          product_family =
            VALUES(product_family),

          bag_quantity =
            VALUES(bag_quantity),

          carton_quantity =
            VALUES(carton_quantity),

          standard_price_per_1000 =
            VALUES(standard_price_per_1000),

          carton_price_per_1000 =
            VALUES(carton_price_per_1000),

          price_list_date =
            VALUES(price_list_date),

          updated_at =
            CURRENT_TIMESTAMP
        `,
        values,
      );

      processedRows += batch.length;
      affectedRows += result.affectedRows;
    }

    await connection.commit();

    return res.json({
      success: true,
      message: `${processedRows} item prices processed successfully. Existing matching products were updated and previous unmatched prices were preserved.`,
      data: {
        processed_rows: processedRows,
        affected_rows: affectedRows,
        worksheet: firstSheetName,
        price_list_date: priceListDate,
      },
    });
  } catch (error) {
    try {
      await connection.rollback();
    } catch {
      // The transaction may not have started.
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

    /*
     * First check whether the entered part exists directly
     * in either stock or price data.
     */
    const [directStockRows] = await pool.query(
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

    const [directPriceRows] = await pool.query(
      `
      SELECT
        product_number,
        normalized_product_number
      FROM pem_item_prices
      WHERE normalized_product_number = ?
      LIMIT 1
      `,
      [normalizedEnteredPartNumber],
    );

    let matchType = "direct";
    let matchedPemPartNumber = enteredPartNumber;
    let normalizedMatchedPemPartNumber = normalizedEnteredPartNumber;

    let customerPartNumber = "";
    let description = "";

    const hasDirectMatch =
      directStockRows.length > 0 || directPriceRows.length > 0;

    if (hasDirectMatch) {
      matchedPemPartNumber =
        directStockRows[0]?.part_number ||
        directPriceRows[0]?.product_number ||
        enteredPartNumber;

      normalizedMatchedPemPartNumber =
        normalizePartNumber(matchedPemPartNumber);

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
        [normalizedMatchedPemPartNumber],
      );

      if (descriptionRows.length) {
        description = descriptionRows[0].description || "";
      }
    } else {
      /*
       * No direct stock or price match.
       * Try Captive-to-PEM mapping.
       */
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
          message: "Part number was not found in stock, mapping or price data.",
        });
      }

      const mapping = mappingRows[0];

      matchType = "mapping";
      matchedPemPartNumber = mapping.pem_part_number;

      normalizedMatchedPemPartNumber = mapping.normalized_pem_part_number;

      customerPartNumber = mapping.captive_part_number;

      description = mapping.description || "";
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
      [normalizedMatchedPemPartNumber, stockLocation],
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
      [normalizedMatchedPemPartNumber],
    );

    const stock = stockRows[0] || null;
    const price = priceRows[0] || null;

    /*
     * A mapping may exist even if neither stock nor price
     * currently exists. Return it with zero stock so the user
     * can still complete the quote manually.
     */
    const bagQuantity =
      price?.bag_quantity == null ? null : Number(price.bag_quantity);

    const cartonQuantity =
      price?.carton_quantity == null ? null : Number(price.carton_quantity);

    const standardPricePer1000 =
      price?.standard_price_per_1000 == null
        ? null
        : Number(price.standard_price_per_1000);

    const cartonPricePer1000 =
      price?.carton_price_per_1000 == null
        ? null
        : Number(price.carton_price_per_1000);

    const standardUnitPrice =
      standardPricePer1000 == null ? null : standardPricePer1000 / 1000;

    const cartonUnitPrice =
      cartonPricePer1000 == null ? null : cartonPricePer1000 / 1000;

    return res.json({
      success: true,
      message:
        !stock && price
          ? "Part found in price list. No stock record was found."
          : stock && !price
            ? "Part found in stock. No price record was found."
            : "Part found.",

      data: {
        enteredPartNumber,

        /*
         * Frontend displays the search value as Ampec P/N.
         * This field contains the resolved PEM number for lookup.
         */
        ampecPartNumber: enteredPartNumber,
        matchedPemPartNumber,

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
      message: error.message || "Unable to look up the part number.",
    });
  }
}
