import type {
  CalculatedQuoteLine,
  QuoteSettings,
} from "../types/buySale.types";
import { formatCurrency } from "./BuySaleCalculations";

function escapeHtml(value: string): string {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function buildCustomerQuoteHtml(
  lines: CalculatedQuoteLine[],
  settings: QuoteSettings,
): string {
  const validLines = lines.filter(
    (line) =>
      line.ampecPartNumber || line.customerPartNumber || line.description,
  );

  const rows = validLines
    .map(
      (line) => `
        <tr>
          <td style="
            border:1px solid #cbd5e1;
            padding:8px 10px;
            text-align:center;
            font-size:12px;
            color:#334155;
            vertical-align:middle;
          ">
            ${escapeHtml(line.ampecPartNumber)}
          </td>

          <td style="
            border:1px solid #cbd5e1;
            padding:8px 10px;
            text-align:center;
            font-size:12px;
            color:#334155;
            vertical-align:middle;
          ">
            ${escapeHtml(line.customerPartNumber)}
          </td>

          <td style="
            border:1px solid #cbd5e1;
            padding:8px 10px;
            text-align:left;
            font-size:12px;
            color:#334155;
            vertical-align:middle;
          ">
            ${escapeHtml(line.description)}
          </td>

          <td style="
            border:1px solid #cbd5e1;
            padding:8px 10px;
            text-align:center;
            font-size:12px;
            color:#334155;
            vertical-align:middle;
          ">
            ${line.requiredQuantity || ""}
          </td>

          <td style="
            border:1px solid #cbd5e1;
            padding:8px 10px;
            text-align:center;
            font-size:12px;
            font-weight:700;
            color:#065f46;
            background:#ecfdf5;
            vertical-align:middle;
          ">
            ${formatCurrency(line.finalUnitPriceAud, "AUD")}
          </td>

          <td style="
            border:1px solid #cbd5e1;
            padding:8px 10px;
            text-align:center;
            font-size:12px;
            color:#334155;
            vertical-align:middle;
          ">
            ${escapeHtml(line.leadTime)}
          </td>

          <td style="
            border:1px solid #cbd5e1;
            padding:8px 10px;
            text-align:center;
            font-size:12px;
            color:#334155;
            vertical-align:middle;
          ">
            ${escapeHtml(line.ncnr)}
          </td>

          <td style="
            border:1px solid #cbd5e1;
            padding:8px 10px;
            text-align:left;
            font-size:12px;
            color:#334155;
            vertical-align:middle;
          ">
            ${escapeHtml(line.remark)}
          </td>
        </tr>
      `,
    )
    .join("");

  return `
    <table
      role="presentation"
      cellspacing="0"
      cellpadding="0"
      style="
        width:100%;
        border-collapse:collapse;
        table-layout:fixed;
        font-family:Arial,Helvetica,sans-serif;
        color:#0f172a;
      "
    >
      <colgroup>
        <col style="width:13%;" />
        <col style="width:13%;" />
        <col style="width:28%;" />
        <col style="width:9%;" />
        <col style="width:13%;" />
        <col style="width:10%;" />
        <col style="width:9%;" />
        <col style="width:20%;" />
      </colgroup>

      <thead>
        <tr>
          ${["Ampec P/N", "Cust P/N", "Description", "QTY (Pcs)"]
            .map(
              (header) => `
                <th style="
                  border:1px solid #cbd5e1;
                  background:#f1f5f9;
                  padding:9px 10px;
                  text-align:center;
                  font-size:11px;
                  font-weight:700;
                  color:#334155;
                  text-transform:uppercase;
                  vertical-align:middle;
                ">
                  ${header}
                </th>
              `,
            )
            .join("")}

          <th style="
            border:1px solid #cbd5e1;
            background:#fef2f2;
            padding:9px 10px;
            text-align:center;
            font-size:11px;
            font-weight:700;
            color:#b91c1c;
            text-transform:uppercase;
            vertical-align:middle;
          ">
            U/P<br />
            <span style="
              font-size:10px;
              font-weight:400;
            ">
              AUD, ex GST
            </span>
          </th>

          ${["L/T", "NCNR?", "Remark"]
            .map(
              (header) => `
                <th style="
                  border:1px solid #cbd5e1;
                  background:#f1f5f9;
                  padding:9px 10px;
                  text-align:center;
                  font-size:11px;
                  font-weight:700;
                  color:#334155;
                  text-transform:uppercase;
                  vertical-align:middle;
                ">
                  ${header}
                </th>
              `,
            )
            .join("")}
        </tr>
      </thead>

      <tbody>
        ${rows}

        <tr>
          <td colspan="2" style="
            border:1px solid #cbd5e1;
            background:#f8fafc;
            padding:8px 10px;
          "></td>

          <td style="
            border:1px solid #cbd5e1;
            background:#f8fafc;
            padding:8px 10px;
            text-align:center;
            font-size:12px;
            font-weight:700;
            color:#334155;
          ">
            Freight &amp; Handling
          </td>

          <td style="
            border:1px solid #cbd5e1;
            background:#f8fafc;
            padding:8px 10px;
            text-align:center;
            font-size:12px;
            color:#334155;
          ">
            1
          </td>

          <td style="
            border:1px solid #cbd5e1;
            background:#fef9c3;
            padding:8px 10px;
            text-align:center;
            font-size:12px;
            color:#0f172a;
          ">
            <div style="font-weight:700;">
              ${formatCurrency(settings.freightCharge, "AUD")}
            </div>

            <div style="
              margin-top:2px;
              font-size:10px;
              font-style:italic;
              color:#475569;
            ">
              ${escapeHtml(settings.freightNote)}
            </div>
          </td>

          <td colspan="3" style="
            border:1px solid #cbd5e1;
            background:#f8fafc;
            padding:8px 10px;
          "></td>
        </tr>
      </tbody>
    </table>
  `;
}

function buildCustomerQuoteText(
  lines: CalculatedQuoteLine[],
  settings: QuoteSettings,
): string {
  const validLines = lines.filter(
    (line) =>
      line.ampecPartNumber || line.customerPartNumber || line.description,
  );

  const header = [
    "Ampec P/N",
    "Cust P/N",
    "Description",
    "QTY (Pcs)",
    "U/P (AUD, ex GST)",
    "L/T",
    "NCNR?",
    "Remark",
  ].join("\t");

  const rows = validLines.map((line) =>
    [
      line.ampecPartNumber,
      line.customerPartNumber,
      line.description,
      line.requiredQuantity,
      formatCurrency(line.finalUnitPriceAud, "AUD"),
      line.leadTime,
      line.ncnr,
      line.remark,
    ].join("\t"),
  );

  rows.push(
    [
      "",
      "",
      "Freight & Handling",
      "1",
      `${formatCurrency(settings.freightCharge, "AUD")} ${settings.freightNote}`,
      "",
      "",
      "",
    ].join("\t"),
  );

  return [header, ...rows].join("\n");
}

export async function copyCustomerQuote(
  lines: CalculatedQuoteLine[],
  settings: QuoteSettings,
): Promise<void> {
  const html = buildCustomerQuoteHtml(lines, settings);
  const text = buildCustomerQuoteText(lines, settings);

  if (
    navigator.clipboard &&
    typeof ClipboardItem !== "undefined" &&
    navigator.clipboard.write
  ) {
    const clipboardItem = new ClipboardItem({
      "text/html": new Blob([html], {
        type: "text/html",
      }),

      "text/plain": new Blob([text], {
        type: "text/plain",
      }),
    });

    await navigator.clipboard.write([clipboardItem]);
    return;
  }

  await navigator.clipboard.writeText(text);
}
