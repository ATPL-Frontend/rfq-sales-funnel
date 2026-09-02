import {
  AlertCircle,
  CheckCircle2,
  FileSpreadsheet,
  Loader2,
  UploadCloud,
  X,
} from "lucide-react";
import * as React from "react";
import * as XLSX from "xlsx";

import type { UploadState, UploadType } from "@/types/buySale.types";

type Props = {
  open: boolean;
  stockSheet: string;
  uploads: Record<UploadType, UploadState>;

  onClose: () => void;
  onStockSheetChange: (value: string) => void;

  onFileChange: (type: UploadType, file: File | null) => void;

  onUpload: (type: UploadType, file: File) => Promise<void>;
};

type DetectedFile = {
  id: string;
  file: File;
  type: UploadType | null;
  status: "detecting" | "uploading" | "success" | "error";
  error?: string;
};

const uploadTypeLabels: Record<UploadType, string> = {
  stock: "PEM Stock List",
  mapping: "Part Mapping",
  price: "Item Price",
};

export function BuySaleUploadSection({
  open,
  stockSheet,
  uploads,
  onClose,
  onStockSheetChange,
  onFileChange,
  onUpload,
}: Props) {
  const [dragging, setDragging] = React.useState(false);
  const [files, setFiles] = React.useState<DetectedFile[]>([]);
  const inputRef = React.useRef<HTMLInputElement | null>(null);

  React.useEffect(() => {
    if (!open) {
      return;
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    document.addEventListener("keydown", handleEscape);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  React.useEffect(() => {
    if (!open) {
      setFiles([]);
      setDragging(false);
    }
  }, [open]);

  if (!open) {
    return null;
  }

  const processFiles = async (selectedFiles: File[]) => {
    const excelFiles = selectedFiles.filter(isExcelFile);

    if (!excelFiles.length) {
      return;
    }

    const newItems: DetectedFile[] = excelFiles.map((file) => ({
      id: createFileId(file),
      file,
      type: null,
      status: "detecting",
    }));

    setFiles((prev) => [...prev, ...newItems]);

    for (const item of newItems) {
      await detectAndUpload(item);
    }

    if (inputRef.current) {
      inputRef.current.value = "";
    }
  };

  const detectAndUpload = async (item: DetectedFile) => {
    try {
      const detectedType = await detectWorkbookType(item.file);

      if (!detectedType) {
        updateItem(item.id, {
          status: "error",
          type: null,
          error:
            "File type could not be detected. Check that the workbook contains the expected columns.",
        });

        return;
      }

      updateItem(item.id, {
        type: detectedType,
        status: "uploading",
        error: undefined,
      });

      onFileChange(detectedType, item.file);

      await onUpload(detectedType, item.file);

      updateItem(item.id, {
        type: detectedType,
        status: "success",
      });
    } catch (error: any) {
      updateItem(item.id, {
        status: "error",
        error:
          error?.response?.data?.message ||
          error?.message ||
          "Failed to process file.",
      });
    }
  };

  const updateItem = (
    id: string,
    changes: Partial<Omit<DetectedFile, "id" | "file">>,
  ) => {
    setFiles((prev) =>
      prev.map((item) =>
        item.id === id
          ? {
              ...item,
              ...changes,
            }
          : item,
      ),
    );
  };

  const removeItem = (id: string) => {
    setFiles((prev) => prev.filter((item) => item.id !== id));
  };

  const clearFinished = () => {
    setFiles((prev) =>
      prev.filter(
        (item) => item.status === "detecting" || item.status === "uploading",
      ),
    );
  };

  const isBusy = files.some(
    (item) => item.status === "detecting" || item.status === "uploading",
  );

  const successfulCount = files.filter(
    (item) => item.status === "success",
  ).length;

  const failedCount = files.filter((item) => item.status === "error").length;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm"
      onMouseDown={(event) => {
        if (event.currentTarget === event.target && !isBusy) {
          onClose();
        }
      }}
    >
      <div className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border bg-white shadow-2xl dark:bg-slate-800">
        {/* HEADER */}
        <div className="flex items-start justify-between gap-4 border-b px-5 py-4 md:px-6">
          <div>
            <h2 className="text-xl font-semibold">Manage Excel Data</h2>

            <p className="mt-1 text-sm text-muted-foreground">
              Drop one or more Excel files. The system will automatically detect
              the file type and import it.
            </p>
          </div>

          <button
            type="button"
            disabled={isBusy}
            onClick={onClose}
            className="inline-flex size-10 shrink-0 items-center justify-center rounded-lg border text-muted-foreground transition hover:bg-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
            aria-label="Close upload modal"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* CONTENT */}
        <div className="flex-1 overflow-y-auto p-5 md:p-6">
          <div className="rounded-2xl border bg-card p-5">
            {/* STOCK LOCATION */}
            <div className="mb-5 flex flex-col justify-between gap-3 border-b pb-5 sm:flex-row sm:items-center">
              <div>
                <p className="text-sm font-medium">Stock Location</p>

                <p className="mt-1 text-xs text-muted-foreground">
                  Used automatically when a PEM Stock List is detected.
                </p>
              </div>

              <select
                value={stockSheet}
                disabled={isBusy}
                onChange={(event) => onStockSheetChange(event.target.value)}
                className="h-10 min-w-44 rounded-lg border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-60"
              >
                <option value="Kunshan">Kunshan</option>
                <option value="Malaysia">Malaysia</option>
              </select>
            </div>

            {/* FILE INPUT */}
            <input
              ref={inputRef}
              type="file"
              multiple
              accept=".xlsx,.xls"
              className="hidden"
              onChange={(event) => {
                const selected = Array.from(event.target.files || []);

                void processFiles(selected);
              }}
            />

            {/* DROP ZONE */}
            <button
              type="button"
              disabled={isBusy}
              onClick={() => inputRef.current?.click()}
              onDragEnter={(event) => {
                event.preventDefault();
                event.stopPropagation();

                if (!isBusy) {
                  setDragging(true);
                }
              }}
              onDragOver={(event) => {
                event.preventDefault();
                event.stopPropagation();

                if (!isBusy) {
                  setDragging(true);
                }
              }}
              onDragLeave={(event) => {
                event.preventDefault();
                event.stopPropagation();

                if (event.currentTarget === event.target) {
                  setDragging(false);
                }
              }}
              onDrop={(event) => {
                event.preventDefault();
                event.stopPropagation();

                setDragging(false);

                if (isBusy) {
                  return;
                }

                const droppedFiles = Array.from(event.dataTransfer.files);

                void processFiles(droppedFiles);
              }}
              className={`flex min-h-52 w-full flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-8 text-center transition ${
                dragging
                  ? "border-primary bg-primary/5"
                  : "border-border bg-muted/20 hover:border-primary/60 hover:bg-muted/40"
              } ${isBusy ? "cursor-not-allowed opacity-60" : "cursor-pointer"}`}
            >
              <div className="inline-flex size-14 items-center justify-center rounded-full border bg-background shadow-sm">
                {isBusy ? (
                  <Loader2 className="size-6 animate-spin text-primary" />
                ) : (
                  <UploadCloud className="size-6 text-primary" />
                )}
              </div>

              <p className="mt-4 text-sm font-semibold">
                {isBusy
                  ? "Processing Excel files..."
                  : "Drag and drop Excel files here"}
              </p>

              <p className="mt-1 text-xs text-muted-foreground">
                or click to browse your computer
              </p>

              <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                <TypeBadge label="PEM Stock" />
                <TypeBadge label="Part Mapping" />
                <TypeBadge label="Item Price" />
              </div>

              <p className="mt-4 text-xs text-muted-foreground">
                Multiple .xlsx or .xls files can be uploaded together.
              </p>
            </button>

            {/* DETECTION INFO */}
            <div className="mt-4 rounded-lg bg-muted/40 px-4 py-3">
              <p className="text-xs text-muted-foreground">
                File type is identified from workbook columns:
                <span className="font-medium text-foreground">
                  {" "}
                  Item Number + Nett Inventory
                </span>{" "}
                for Stock,
                <span className="font-medium text-foreground">
                  {" "}
                  Captive + PEM + Description
                </span>{" "}
                for Mapping, and
                <span className="font-medium text-foreground">
                  {" "}
                  Product + Pack/Carton + Price
                </span>{" "}
                for Item Price.
              </p>
            </div>

            {/* FILE RESULTS */}
            {files.length > 0 && (
              <div className="mt-5">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-semibold">Uploads</h3>

                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {successfulCount > 0 && (
                        <span>{successfulCount} completed</span>
                      )}
                      {successfulCount > 0 && failedCount > 0 && (
                        <span> · </span>
                      )}
                      {failedCount > 0 && <span>{failedCount} failed</span>}
                    </p>
                  </div>

                  {!isBusy &&
                    files.some(
                      (item) =>
                        item.status === "success" || item.status === "error",
                    ) && (
                      <button
                        type="button"
                        onClick={clearFinished}
                        className="text-xs font-medium text-muted-foreground hover:text-foreground"
                      >
                        Clear list
                      </button>
                    )}
                </div>

                <div className="space-y-2">
                  {files.map((item) => (
                    <FileResultRow
                      key={item.id}
                      item={item}
                      onRemove={() => removeItem(item.id)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* EXISTING BACKEND MESSAGES */}
            <ExistingUploadMessages uploads={uploads} />
          </div>
        </div>

        {/* FOOTER */}
        <div className="flex items-center justify-between gap-4 border-t bg-muted/20 px-5 py-4 md:px-6">
          <p className="text-xs text-muted-foreground">
            Supported: .xlsx and .xls
          </p>

          <button
            type="button"
            disabled={isBusy}
            onClick={onClose}
            className="inline-flex h-10 items-center justify-center rounded-lg border bg-background px-5 text-sm font-medium transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

function TypeBadge({ label }: { label: string }) {
  return (
    <span className="rounded-md border bg-background px-2 py-1 text-[11px] font-medium text-muted-foreground">
      {label}
    </span>
  );
}

function FileResultRow({
  item,
  onRemove,
}: {
  item: DetectedFile;
  onRemove: () => void;
}) {
  const busy = item.status === "detecting" || item.status === "uploading";

  return (
    <div className="rounded-xl border bg-background p-3">
      <div className="flex items-start gap-3">
        <div className="inline-flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted">
          <FileSpreadsheet className="size-5" />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="max-w-full truncate text-sm font-medium">
              {item.file.name}
            </p>

            {item.type && (
              <span className="rounded-md bg-secondary px-2 py-0.5 text-[11px] font-medium text-secondary-foreground">
                {uploadTypeLabels[item.type]}
              </span>
            )}
          </div>

          <p className="mt-1 text-xs text-muted-foreground">
            {formatFileSize(item.file.size)}
          </p>

          {item.status === "detecting" && (
            <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
              <Loader2 className="size-3.5 animate-spin" />
              Detecting file type...
            </div>
          )}

          {item.status === "uploading" && (
            <div className="mt-2 flex items-center gap-1.5 text-xs text-primary">
              <Loader2 className="size-3.5 animate-spin" />
              Detected as{" "}
              {item.type ? uploadTypeLabels[item.type] : "Excel file"}.
              Importing...
            </div>
          )}

          {item.status === "success" && (
            <div className="mt-2 flex items-center gap-1.5 text-xs text-emerald-600">
              <CheckCircle2 className="size-3.5" />
              {item.type
                ? `${uploadTypeLabels[item.type]} imported successfully`
                : "Imported successfully"}
            </div>
          )}

          {item.status === "error" && (
            <div className="mt-2 flex items-start gap-1.5 text-xs text-destructive">
              <AlertCircle className="mt-0.5 size-3.5 shrink-0" />

              <span>{item.error}</span>
            </div>
          )}
        </div>

        {!busy && (
          <button
            type="button"
            onClick={onRemove}
            className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-muted hover:text-foreground"
            aria-label={`Remove ${item.file.name}`}
          >
            <X className="size-4" />
          </button>
        )}
      </div>
    </div>
  );
}

function ExistingUploadMessages({
  uploads,
}: {
  uploads: Record<UploadType, UploadState>;
}) {
  const messages = (Object.keys(uploads) as UploadType[]).flatMap((type) => {
    const state = uploads[type];

    const result: React.ReactNode[] = [];

    if (state.message) {
      result.push(
        <div
          key={`${type}-message`}
          className="flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-xs text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-400"
        >
          <CheckCircle2 className="mt-0.5 size-4 shrink-0" />

          <span>
            <strong>{uploadTypeLabels[type]}:</strong> {state.message}
          </span>
        </div>,
      );
    }

    if (state.error) {
      result.push(
        <div
          key={`${type}-error`}
          className="flex items-start gap-2 rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-2.5 text-xs text-destructive"
        >
          <AlertCircle className="mt-0.5 size-4 shrink-0" />

          <span>
            <strong>{uploadTypeLabels[type]}:</strong> {state.error}
          </span>
        </div>,
      );
    }

    return result;
  });

  if (!messages.length) {
    return null;
  }

  return <div className="mt-4 space-y-2">{messages}</div>;
}

function isExcelFile(file: File) {
  const name = file.name.toLowerCase();

  return name.endsWith(".xlsx") || name.endsWith(".xls");
}

function createFileId(file: File) {
  return `${file.name}-${file.size}-${file.lastModified}-${crypto.randomUUID()}`;
}

async function detectWorkbookType(
  file: File,
): Promise<UploadType | null> {
  const buffer = await file.arrayBuffer();

  const workbook = XLSX.read(buffer, {
    type: "array",
    cellDates: false,
  });

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];

    if (!sheet) continue;

    const rows = XLSX.utils.sheet_to_json<any[]>(sheet, {
      header: 1,
      defval: "",
      raw: false,
    });

    /**
     * Usually headers are within first 30 rows.
     */
    const sampleRows = rows.slice(0, 30);

    const normalizedRows = sampleRows.map((row) =>
      row.map((cell) => normalizeHeader(cell)),
    );

    /**
     * Create one searchable string containing all
     * header-area cells.
     *
     * This handles Excel headers split over multiple rows.
     */
    const allHeaderText = normalizedRows
      .flat()
      .filter(Boolean)
      .join(" ");

    // =====================================================
    // 1. STOCK FILE
    // =====================================================

    const stockDetected =
      containsAny(allHeaderText, [
        "item number",
        "item no",
        "item",
      ]) &&
      containsAny(allHeaderText, [
        "nett inventory",
        "net inventory",
        "nett stock",
      ]);

    if (stockDetected) {
      return "stock";
    }

    // =====================================================
    // 2. PART MAPPING
    // =====================================================

    const mappingDetected =
      containsAny(allHeaderText, [
        "captive",
        "captive part",
        "captive part number",
      ]) &&
      containsAny(allHeaderText, [
        "pem",
        "pem part",
        "pem part number",
      ]) &&
      containsAny(allHeaderText, [
        "description",
        "desc",
      ]);

    if (mappingDetected) {
      return "mapping";
    }

    // =====================================================
    // 3. ITEM PRICE
    // =====================================================

    /**
     * Supports formats such as:
     *
     * Product
     * Number
     *
     * PE / Bag
     * Order Qty
     *
     * Carton/
     * Order Qty
     *
     * PE / Bag
     * Order Price
     *
     * Carton/
     * Order Price
     */

    const hasProduct =
      containsAny(allHeaderText, [
        "product",
        "product number",
        "product no",
        "item",
        "item number",
        "part",
        "part number",
      ]);

    const hasQuantity =
      containsAny(allHeaderText, [
        "order qty",
        "order quantity",
        "carton",
        "bag",
        "pack",
        "pe bag",
      ]);

    const hasPrice =
      containsAny(allHeaderText, [
        "order price",
        "unit price",
        "nett price",
        "net price",
        "price",
      ]);

    /**
     * Strong PEM distributor-price signature.
     */
    const hasPemPriceStructure =
      containsAny(allHeaderText, [
        "pe bag",
        "pe / bag",
        "carton",
      ]) &&
      hasQuantity &&
      hasPrice;

    if (
      hasProduct &&
      hasQuantity &&
      hasPrice
    ) {
      return "price";
    }

    if (hasProduct && hasPemPriceStructure) {
      return "price";
    }

    // =====================================================
    // COLUMN-BASED DETECTION
    // =====================================================

    /**
     * Some Excel files split one logical header vertically:
     *
     * A4 = Product
     * A5 = Number
     *
     * F4 = Carton/
     * F5 = Order Price
     *
     * Build combined headers per column:
     *
     * "product number"
     * "carton order price"
     */
    const combinedColumnHeaders =
      buildCombinedColumnHeaders(normalizedRows);

    const priceColumnDetected =
      combinedColumnHeaders.some((header) =>
        containsAny(header, [
          "product number",
          "product no",
        ]),
      ) &&
      combinedColumnHeaders.some((header) =>
        containsAny(header, [
          "order qty",
          "order quantity",
        ]),
      ) &&
      combinedColumnHeaders.some((header) =>
        containsAny(header, [
          "order price",
          "unit price",
        ]),
      );

    if (priceColumnDetected) {
      return "price";
    }
  }

  // =====================================================
  // FILENAME FALLBACK
  // =====================================================

  return detectFromFilename(file.name);
}

function buildCombinedColumnHeaders(
  rows: string[][],
): string[] {
  const maxColumns = Math.max(
    0,
    ...rows.map((row) => row.length),
  );

  const headers: string[] = [];

  for (let col = 0; col < maxColumns; col++) {
    const values: string[] = [];

    /**
     * Only inspect first ~12 header rows.
     */
    for (
      let rowIndex = 0;
      rowIndex < Math.min(rows.length, 12);
      rowIndex++
    ) {
      const value = rows[rowIndex]?.[col];

      if (!value) continue;

      /**
       * Prevent repeating identical values.
       */
      if (!values.includes(value)) {
        values.push(value);
      }
    }

    headers.push(
      normalizeHeader(values.join(" ")),
    );
  }

  return headers;
}

function detectFromFilename(
  filename: string,
): UploadType | null {
  const name = normalizeHeader(
    filename.replace(/\.(xlsx|xls)$/i, ""),
  );

  // STOCK
  if (
    name.includes("pem stock") ||
    name.includes("stock list") ||
    name.includes("inventory") ||
    name.includes("stock")
  ) {
    return "stock";
  }

  // MAPPING
  if (
    name.includes("part mapping") ||
    name.includes("mapping") ||
    name.includes("captive")
  ) {
    return "mapping";
  }

  // PRICE
  if (
    name.includes("item price") ||
    name.includes("price list") ||
    name.includes("pricing") ||
    name.includes("disty price") ||
    name.includes("distributor price") ||
    name.includes("distributor prices") ||
    name.includes("price")
  ) {
    return "price";
  }

  return null;
}

function normalizeHeader(value: unknown): string {
  return String(value ?? "")
    .trim()
    .toLowerCase()

    // Treat slash/backslash as spaces.
    .replace(/[\\/]+/g, " ")

    // Replace underscores and hyphens.
    .replace(/[_-]+/g, " ")

    // Remove unnecessary punctuation.
    .replace(/[():,]+/g, " ")

    // Collapse line breaks / repeated spaces.
    .replace(/\s+/g, " ")
    .trim();
}

function containsAny(
  text: string,
  candidates: string[],
): boolean {
  const normalizedText = normalizeHeader(text);

  return candidates.some((candidate) =>
    normalizedText.includes(
      normalizeHeader(candidate),
    ),
  );
}

function formatFileSize(bytes: number): string {
  if (!bytes) {
    return "0 KB";
  }

  if (bytes < 1024 * 1024) {
    return `${Math.ceil(bytes / 1024)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}
