"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import api from "@/lib/api";
import {
  AlertTriangle,
  CheckCircle2,
  FileSpreadsheet,
  Loader2,
  UploadCloud,
  X,
} from "lucide-react";
import { useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";

type CablePriceSummary = {
  total_items: number | string;
  total_standards: number | string;
  total_sheets: number | string;

  imported_at: string | null;

  file_name: string | null;
};

type YellowColumn = {
  column: string;

  yellow_cells: number;

  cells?: string[];

  values?: string[];
};

type PriceRangeColumn = {
  column: string;

  range_label: string;

  row_number: number;
};

type WorkbookColumn = {
  column: string;

  label: string;
};

type WorkbookPreviewRow = {
  row_number: number;

  values: Record<string, string | number | null>;
};

type WorkbookSheetAnalysis = {
  sheet_name: string;

  yellow_columns: YellowColumn[];

  price_range_columns: PriceRangeColumn[];

  suggested_price_column: string | null;

  requires_price_column_selection: boolean;

  columns: WorkbookColumn[];

  preview_rows: WorkbookPreviewRow[];
};

type WorkbookAnalysis = {
  file_name: string;

  requires_price_column_selection: boolean;

  sheets: WorkbookSheetAnalysis[];
};

type Props = {
  summary: CablePriceSummary | null;

  onSuccess: () => void | Promise<void>;

  onCancel: () => void;
};

export default function CablePriceModal({
  summary,
  onSuccess,
  onCancel,
}: Props) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [file, setFile] = useState<File | null>(null);

  const [analysis, setAnalysis] = useState<WorkbookAnalysis | null>(null);

  const [priceColumns, setPriceColumns] = useState<Record<string, string>>({});

  const [dragging, setDragging] = useState(false);

  const [analyzing, setAnalyzing] = useState(false);

  const [uploading, setUploading] = useState(false);

  const busy = analyzing || uploading;

  // =========================================
  // PRICE COLUMN VALIDATION
  // =========================================
  const missingPriceColumns = useMemo(() => {
    if (!analysis) {
      return [];
    }

    return analysis.sheets.filter((sheet) => !priceColumns[sheet.sheet_name]);
  }, [analysis, priceColumns]);

  const allColumnsSelected =
    Boolean(analysis) && missingPriceColumns.length === 0;

  // =========================================
  // RESET
  // =========================================
  const resetUpload = () => {
    setFile(null);

    setAnalysis(null);

    setPriceColumns({});

    setDragging(false);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const clearFile = () => {
    if (busy) {
      return;
    }

    resetUpload();
  };

  // =========================================
  // ANALYZE WORKBOOK
  // =========================================
  const analyzeFile = async (selectedFile: File) => {
    if (!isExcelFile(selectedFile)) {
      toast.error("Please select an XLS or XLSX file.");

      return;
    }

    setFile(selectedFile);

    setAnalysis(null);

    setPriceColumns({});

    setAnalyzing(true);

    try {
      const formData = new FormData();

      formData.append("file", selectedFile);

      const { data } = await api.post("/api/cable-prices/analyze", formData);

      if (!data?.success || !data?.data) {
        throw new Error(data?.message || "Workbook analysis failed.");
      }

      const workbookAnalysis = data.data as WorkbookAnalysis;

      if (
        !Array.isArray(workbookAnalysis.sheets) ||
        !workbookAnalysis.sheets.length
      ) {
        throw new Error("No worksheets were found in the workbook.");
      }

      setAnalysis(workbookAnalysis);

      /*
       * Automatically select customer-marked
       * yellow price columns when detected.
       *
       * Example:
       * Y13 = 13401-13700 yellow
       * => Y selected automatically.
       */
      const initialSelections: Record<string, string> = {};

      for (const sheet of workbookAnalysis.sheets) {
        if (sheet.suggested_price_column) {
          initialSelections[sheet.sheet_name] = sheet.suggested_price_column;
        }
      }

      setPriceColumns(initialSelections);
    } catch (error: any) {
      toast.error(getErrorMessage(error, "Unable to analyze Excel workbook."));

      resetUpload();
    } finally {
      setAnalyzing(false);
    }
  };

  // =========================================
  // UPLOAD AND REPLACE
  // =========================================
  const uploadExcel = async () => {
    if (!file) {
      toast.error("Select an Excel file first.");

      return;
    }

    if (!analysis) {
      toast.error("Workbook analysis is not complete.");

      return;
    }

    if (missingPriceColumns.length > 0) {
      toast.error(
        `Select a price column for ${missingPriceColumns.length} worksheet${
          missingPriceColumns.length > 1 ? "s" : ""
        }.`,
      );

      return;
    }

    setUploading(true);

    try {
      const formData = new FormData();

      formData.append("file", file);

      formData.append("vendor_code", "3F");

      formData.append("currency", "USD");

      formData.append("price_columns", JSON.stringify(priceColumns));

      const { data } = await api.post("/api/cable-prices/upload", formData);

      if (!data?.success) {
        throw new Error(data?.message || "Cable price upload failed.");
      }

      toast.success(data?.message || "Cable price data updated successfully.");

      resetUpload();

      await onSuccess();
    } catch (error: any) {
      toast.error(getErrorMessage(error, "Failed to update cable price data."));
    } finally {
      setUploading(false);
    }
  };

  // =========================================
  // CANCEL
  // =========================================
  const handleCancel = () => {
    if (busy) {
      return;
    }

    resetUpload();

    onCancel();
  };

  return (
    <div className="space-y-5">
      {/* =====================================
          CURRENT DATABASE INFO
      ====================================== */}
      {summary && Number(summary.total_items) > 0 && (
        <div className="flex items-start gap-3 rounded-xl border bg-muted/20 p-4">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400">
            <CheckCircle2 className="size-5" />
          </div>

          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold">Current 3F Price Data</p>

            {summary.file_name && (
              <p className="mt-1 truncate text-xs text-muted-foreground">
                {summary.file_name}
              </p>
            )}

            <div className="mt-2 flex flex-wrap gap-2">
              <Badge variant="secondary">
                {Number(summary.total_items).toLocaleString()} Items
              </Badge>

              <Badge variant="secondary">
                {Number(summary.total_standards).toLocaleString()} Standards
              </Badge>

              <Badge variant="secondary">
                {Number(summary.total_sheets).toLocaleString()} Sheets
              </Badge>
            </div>

            {summary.imported_at && (
              <p className="mt-2 text-xs text-muted-foreground">
                Last updated: {formatDateTime(summary.imported_at)}
              </p>
            )}
          </div>
        </div>
      )}

      {/* =====================================
          HIDDEN FILE INPUT
      ====================================== */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".xls,.xlsx"
        className="hidden"
        disabled={busy}
        onChange={(event) => {
          const selectedFile = event.target.files?.[0];

          if (selectedFile) {
            void analyzeFile(selectedFile);
          }
        }}
      />

      {/* =====================================
          DROPZONE
      ====================================== */}
      {!file ? (
        <div
          role="button"
          tabIndex={0}
          onClick={() => {
            if (!busy) {
              fileInputRef.current?.click();
            }
          }}
          onKeyDown={(event) => {
            if (!busy && (event.key === "Enter" || event.key === " ")) {
              event.preventDefault();

              fileInputRef.current?.click();
            }
          }}
          onDragEnter={(event) => {
            event.preventDefault();

            if (!busy) {
              setDragging(true);
            }
          }}
          onDragOver={(event) => {
            event.preventDefault();

            if (!busy) {
              setDragging(true);
            }
          }}
          onDragLeave={(event) => {
            event.preventDefault();

            if (event.currentTarget === event.target) {
              setDragging(false);
            }
          }}
          onDrop={(event) => {
            event.preventDefault();

            setDragging(false);

            if (busy) {
              return;
            }

            const selectedFile = event.dataTransfer.files?.[0];

            if (selectedFile) {
              void analyzeFile(selectedFile);
            }
          }}
          className={`flex min-h-52 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-8 text-center transition ${
            dragging
              ? "border-primary bg-primary/5"
              : "border-border bg-muted/20 hover:border-primary/60 hover:bg-muted/40"
          }`}
        >
          <div className="flex size-14 items-center justify-center rounded-full border bg-background shadow-sm">
            <UploadCloud className="size-6 text-primary" />
          </div>

          <p className="mt-4 text-sm font-semibold">
            Drag and drop the latest 3F Excel file
          </p>

          <p className="mt-1 text-xs text-muted-foreground">
            or click to browse
          </p>

          <p className="mt-4 text-xs text-muted-foreground">
            XLS or XLSX · All worksheets are analyzed automatically
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* =================================
              SELECTED FILE
          ================================== */}
          <div className="flex items-center gap-3 rounded-xl border bg-muted/20 p-4">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-lg border bg-background">
              {analyzing ? (
                <Loader2 className="size-5 animate-spin text-primary" />
              ) : (
                <FileSpreadsheet className="size-5 text-emerald-600" />
              )}
            </div>

            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{file.name}</p>

              <p className="mt-1 text-xs text-muted-foreground">
                {formatFileSize(file.size)}
              </p>
            </div>

            {!busy && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={clearFile}
              >
                <X className="size-4" />
              </Button>
            )}
          </div>

          {/* =================================
              ANALYZING
          ================================== */}
          {analyzing && (
            <div className="flex min-h-32 flex-col items-center justify-center rounded-xl border bg-muted/10 text-center">
              <Loader2 className="size-6 animate-spin text-primary" />

              <p className="mt-3 text-sm font-medium">Analyzing workbook...</p>

              <p className="mt-1 text-xs text-muted-foreground">
                Reading all worksheets and detecting customer marked price
                ranges.
              </p>
            </div>
          )}

          {/* =================================
              WORKBOOK ANALYSIS
          ================================== */}
          {!analyzing && analysis && (
            <div className="space-y-4">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-sm font-semibold">Pricing Columns</h3>

                  <Badge variant="secondary">
                    {analysis.sheets.length}{" "}
                    {analysis.sheets.length === 1 ? "Sheet" : "Sheets"}
                  </Badge>
                </div>

                <p className="mt-1 text-xs text-muted-foreground">
                  Customer-marked yellow price ranges are selected
                  automatically. If yellow formatting cannot be detected, select
                  the correct price column manually.
                </p>
              </div>

              <div className="space-y-3">
                {analysis.sheets.map((sheet) => (
                  <SheetPriceSelection
                    key={sheet.sheet_name}
                    sheet={sheet}
                    selectedColumn={priceColumns[sheet.sheet_name] || ""}
                    disabled={uploading}
                    onChange={(column) =>
                      setPriceColumns((current) => ({
                        ...current,

                        [sheet.sheet_name]: column,
                      }))
                    }
                  />
                ))}
              </div>

              {/* SELECTION WARNING */}
              {missingPriceColumns.length > 0 && (
                <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs text-amber-800 dark:border-amber-900 dark:bg-amber-950/20 dark:text-amber-400">
                  <AlertTriangle className="mt-0.5 size-4 shrink-0" />

                  <span>
                    Select a price column for {missingPriceColumns.length}{" "}
                    worksheet
                    {missingPriceColumns.length > 1 ? "s" : ""} before
                    importing.
                  </span>
                </div>
              )}

              {/* REPLACE WARNING */}
              <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs text-amber-800 dark:border-amber-900 dark:bg-amber-950/20 dark:text-amber-400">
                <AlertTriangle className="mt-0.5 size-4 shrink-0" />

                <span>
                  Uploading this workbook will replace all existing 3F cable
                  price data. Existing data is removed only after the new
                  workbook is successfully validated.
                </span>
              </div>
            </div>
          )}

          {/* =================================
              ACTIONS
          ================================== */}
          {!analyzing && analysis && (
            <div className="flex flex-col-reverse gap-2 border-t pt-4 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="secondary"
                disabled={busy}
                onClick={handleCancel}
              >
                Cancel
              </Button>

              <Button
                type="button"
                disabled={uploading || !allColumnsSelected}
                onClick={() => void uploadExcel()}
              >
                {uploading ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Importing...
                  </>
                ) : (
                  <>
                    <UploadCloud className="size-4" />
                    Upload and Replace
                  </>
                )}
              </Button>
            </div>
          )}
        </div>
      )}

      {/* CANCEL BEFORE FILE SELECTED */}
      {!file && (
        <div className="flex justify-end border-t pt-4">
          <Button type="button" variant="secondary" onClick={handleCancel}>
            Cancel
          </Button>
        </div>
      )}
    </div>
  );
}

// =========================================
// SHEET PRICE SELECTION
// =========================================

function SheetPriceSelection({
  sheet,
  selectedColumn,
  disabled,
  onChange,
}: {
  sheet: WorkbookSheetAnalysis;

  selectedColumn: string;

  disabled: boolean;

  onChange: (value: string) => void;
}) {
  const selectedYellow = sheet.yellow_columns?.find(
    (item) => item.column === selectedColumn,
  );

  const automaticallyDetected = Boolean(
    selectedColumn && sheet.suggested_price_column === selectedColumn,
  );

  const options = getSheetColumnOptions(sheet);

  const selectedOption = options.find((item) => item.column === selectedColumn);

  return (
    <div className="rounded-xl border bg-muted/20 p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        {/* SHEET INFORMATION */}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="max-w-md truncate text-sm font-semibold">
              {sheet.sheet_name}
            </p>

            {selectedYellow ? (
              <Badge className="border-yellow-300 bg-yellow-100 text-yellow-800 hover:bg-yellow-100 dark:border-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300">
                Customer Marked
              </Badge>
            ) : selectedColumn ? (
              <Badge variant="secondary">Manually Selected</Badge>
            ) : (
              <Badge variant="destructive">Selection Required</Badge>
            )}
          </div>

          {selectedYellow && (
            <p className="mt-1 text-xs text-muted-foreground">
              Yellow detected
              {selectedYellow.cells?.length
                ? ` at ${selectedYellow.cells.join(", ")}`
                : ` in column ${selectedYellow.column}`}
              .
            </p>
          )}

          {automaticallyDetected && selectedOption && (
            <p className="mt-1 text-xs text-muted-foreground">
              Auto-selected: {selectedOption.label}
            </p>
          )}

          {!selectedColumn && (
            <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">
              Yellow price range was not detected. Select the customer's price
              range manually.
            </p>
          )}
        </div>

        {/* COLUMN SELECT */}
        <select
          value={selectedColumn}
          disabled={disabled}
          onChange={(event) => onChange(event.target.value)}
          className={`h-10 w-full rounded-md border bg-background px-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 lg:w-[360px] ${
            !selectedColumn ? "border-amber-400" : ""
          }`}
        >
          <option value="">Select price range</option>

          {options.map((item) => {
            const yellow = sheet.yellow_columns?.some(
              (yellowItem) => yellowItem.column === item.column,
            );

            return (
              <option key={item.column} value={item.column}>
                {item.label}
                {yellow ? " ★ CUSTOMER MARKED" : ""}
              </option>
            );
          })}
        </select>
      </div>

      {/* OTHER YELLOW COLUMNS */}
      {sheet.yellow_columns && sheet.yellow_columns.length > 1 && (
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          <span className="text-xs text-muted-foreground">Yellow columns:</span>

          {sheet.yellow_columns.map((yellow) => (
            <Badge
              key={yellow.column}
              variant="outline"
              className="bg-yellow-50 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300"
            >
              {yellow.column}
              {yellow.values?.length ? ` — ${yellow.values[0]}` : ""}
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}

// =========================================
// BUILD COLUMN OPTIONS
// =========================================

function getSheetColumnOptions(sheet: WorkbookSheetAnalysis) {
  const options = new Map<
    string,
    {
      column: string;
      label: string;
    }
  >();

  /*
   * Best option:
   *
   * Y — 13401-13700
   */
  for (const item of sheet.price_range_columns || []) {
    options.set(item.column, {
      column: item.column,

      label: `${item.column} — ${item.range_label}`,
    });
  }

  /*
   * Include all detected worksheet columns as fallback,
   * so manual selection is still possible if the
   * supplier changes the price range format.
   */
  for (const item of sheet.columns || []) {
    if (!options.has(item.column)) {
      options.set(item.column, {
        column: item.column,

        label: `${item.column} — ${item.label || `Column ${item.column}`}`,
      });
    }
  }

  /*
   * Ensure yellow columns are never missing from the
   * selector even if range detection fails.
   */
  for (const yellow of sheet.yellow_columns || []) {
    if (!options.has(yellow.column)) {
      const yellowValue = yellow.values?.[0];

      options.set(yellow.column, {
        column: yellow.column,

        label: yellowValue
          ? `${yellow.column} — ${yellowValue}`
          : `Column ${yellow.column}`,
      });
    }
  }

  return [...options.values()].sort(
    (a, b) => excelColumnToNumber(a.column) - excelColumnToNumber(b.column),
  );
}

// =========================================
// HELPERS
// =========================================

function excelColumnToNumber(column: string) {
  let result = 0;

  const value = column.toUpperCase();

  for (let index = 0; index < value.length; index++) {
    result = result * 26 + (value.charCodeAt(index) - 64);
  }

  return result;
}

function isExcelFile(file: File) {
  const name = file.name.toLowerCase();

  return name.endsWith(".xls") || name.endsWith(".xlsx");
}

function formatFileSize(bytes: number) {
  if (!bytes) {
    return "0 KB";
  }

  if (bytes < 1024 * 1024) {
    return `${Math.ceil(bytes / 1024)} KB`;
  }

  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

function formatDateTime(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString();
}

function getErrorMessage(error: any, fallback: string) {
  return error?.response?.data?.message || error?.message || fallback;
}
