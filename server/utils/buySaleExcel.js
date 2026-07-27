export function normalizePartNumber(value) {
  return String(value ?? "")
    .trim()
    .toUpperCase()
    .replace(/[‐-‒–—―]/g, "-")
    .replace(/\s+/g, "");
}

export function normalizeHeader(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[\r\n]+/g, " ")
    .replace(/\s*\/\s*/g, "/")
    .replace(/\s+/g, " ");
}

export function toDecimal(value) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const cleaned = String(value)
    .replace(/[$,\s]/g, "")
    .trim();

  const number = Number(cleaned);

  return Number.isFinite(number) ? number : null;
}

export function findHeaderRow(rows, requiredHeaders) {
  return rows.findIndex((row) => {
    const normalizedRow = row.map(normalizeHeader);

    return requiredHeaders.every((requiredHeader) =>
      normalizedRow.includes(normalizeHeader(requiredHeader)),
    );
  });
}

export function findColumnIndex(headers, possibleNames) {
  const normalizedHeaders = headers.map(normalizeHeader);

  for (const name of possibleNames) {
    const index = normalizedHeaders.indexOf(normalizeHeader(name));

    if (index !== -1) {
      return index;
    }
  }

  return -1;
}

export function parsePriceListDate(rows) {
  for (const row of rows.slice(0, 10)) {
    for (const cell of row) {
      const text = String(cell ?? "").trim();

      const match = text.match(/(\d{1,2})\s+([A-Za-z]{3,9})\s+(\d{4})/);

      if (!match) {
        continue;
      }

      const parsedDate = new Date(`${match[1]} ${match[2]} ${match[3]}`);

      if (!Number.isNaN(parsedDate.getTime())) {
        return parsedDate.toISOString().slice(0, 10);
      }
    }
  }

  return null;
}

export async function bulkInsert(
  connection,
  sqlPrefix,
  rows,
  columnCount,
  chunkSize = 500,
) {
  for (let index = 0; index < rows.length; index += chunkSize) {
    const chunk = rows.slice(index, index + chunkSize);

    const placeholders = chunk
      .map(() => `(${Array(columnCount).fill("?").join(", ")})`)
      .join(", ");

    const values = chunk.flat();

    await connection.query(`${sqlPrefix} VALUES ${placeholders}`, values);
  }
}
