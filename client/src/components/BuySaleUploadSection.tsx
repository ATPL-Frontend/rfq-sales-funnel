"use client";

import {
  CheckCircle2,
  FileSpreadsheet,
  Loader2,
  UploadCloud,
  X,
} from "lucide-react";
import * as React from "react";

import type { UploadState, UploadType } from "@/types/buySale.types";

type Props = {
  open: boolean;
  stockSheet: string;
  uploads: Record<UploadType, UploadState>;

  onClose: () => void;
  onStockSheetChange: (value: string) => void;
  onFileChange: (type: UploadType, file: File | null) => void;
  onUpload: (type: UploadType) => void;
};

type UploadCardConfig = {
  type: UploadType;
  title: string;
  description: string;
  helperText: string;
};

const uploadCards: UploadCardConfig[] = [
  {
    type: "stock",
    title: "PEM Stock List",
    description: "Upload the latest PEM stock workbook.",
    helperText: "Reads Item Number and Nett Inventory.",
  },
  {
    type: "mapping",
    title: "Part Mapping",
    description: "Upload Captive-to-PEM part mappings.",
    helperText: "Reads Captive, PEM and Description columns.",
  },
  {
    type: "price",
    title: "Item Price",
    description: "Upload the latest distributor price list.",
    helperText: "Reads product, pack, carton and price data.",
  },
];

export function BuySaleUploadSection({
  open,
  stockSheet,
  uploads,
  onClose,
  onStockSheetChange,
  onFileChange,
  onUpload,
}: Props) {
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

  if (!open) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm"
      onMouseDown={(event) => {
        if (event.currentTarget === event.target) {
          onClose();
        }
      }}
    >
      <div className="flex max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl border bg-white dark:bg-slate-800 shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b px-5 py-4 md:px-6">
          <div>
            <h2 className="text-xl font-semibold">
              Manage Excel Data
            </h2>

            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Upload the latest stock, part mapping and item price files.
              Successful uploads replace the previous data.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="inline-flex size-10 shrink-0 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-700 hover:text-slate-900"
            aria-label="Close upload modal"
          >
            <X className="size-5" />
          </button>
        </div>

        <div className="overflow-y-auto p-5 md:p-6">
          <div className="grid gap-5 lg:grid-cols-3">
            {uploadCards.map((card) => (
              <UploadCard
                key={card.type}
                config={card}
                state={uploads[card.type]}
                stockSheet={stockSheet}
                onStockSheetChange={onStockSheetChange}
                onFileChange={onFileChange}
                onUpload={onUpload}
              />
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between gap-4 border-t bg-slate-50 dark:bg-slate-800 px-5 py-4 md:px-6">
          <p className="text-xs text-slate-500">
            Supported file formats: .xlsx and .xls
          </p>

          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 items-center justify-center rounded-lg border bg-white dark:bg-red-400/60 px-5 text-sm font-medium text-slate-700 dark:text-white transition hover:bg-slate-100"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

function UploadCard({
  config,
  state,
  stockSheet,
  onStockSheetChange,
  onFileChange,
  onUpload,
}: {
  config: UploadCardConfig;
  state: UploadState;
  stockSheet: string;
  onStockSheetChange: (value: string) => void;
  onFileChange: (type: UploadType, file: File | null) => void;
  onUpload: (type: UploadType) => void;
}) {
  const inputId = `buy-sale-${config.type}-upload`;
  const hasFile = Boolean(state.file);

  function clearSelectedFile() {
    onFileChange(config.type, null);

    const input = document.getElementById(inputId) as HTMLInputElement | null;

    if (input) {
      input.value = "";
    }
  }

  return (
    <article className="flex min-h-[410px] flex-col rounded-2xl border bg-white dark:bg-slate-800 p-5 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="inline-flex size-11 shrink-0 items-center justify-center rounded-xl bg-emerald-50 dark:bg-emerald-900 text-emerald-700">
          <FileSpreadsheet className="size-5" />
        </div>

        <div className="min-w-0">
          <h3 className="font-semibold text-slate-900 dark:text-muted-foreground">{config.title}</h3>

          <p className="mt-1 text-sm leading-5 text-slate-500">
            {config.description}
          </p>
        </div>
      </div>

      {config.type === "stock" && (
        <label className="mt-5 flex items-center gap-4">
          <span className="mb-1.5 block text-sm font-medium text-muted-foreground">
            Stock location
          </span>

          <select
            value={stockSheet}
            onChange={(event) => onStockSheetChange(event.target.value)}
            disabled={state.loading}
            className="h-10 flex-1 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 text-sm text-slate-900 dark:text-muted-foreground outline-none transition focus:border-emerald-500 dark:focus:border-none focus:ring-4 dark:focus:ring-none dark:focus:outline-none focus:ring-emerald-100 disabled:cursor-not-allowed disabled:bg-slate-100"
          >
            <option value="Kunshan">Kunshan</option>
            <option value="Malaysia">Malaysia</option>
            {/* <option value="Search">Search</option> */}
          </select>
        </label>
      )}

      <div className={config.type === "stock" ? "mt-4" : "mt-5"}>
        <input
          id={inputId}
          type="file"
          accept=".xlsx,.xls"
          className="hidden"
          disabled={state.loading}
          onChange={(event) => {
            onFileChange(config.type, event.target.files?.[0] ?? null);
          }}
        />

        {!hasFile ? (
          <label
            htmlFor={inputId}
            className="group flex min-h-40 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-800 px-4 py-5 text-center transition hover:border-emerald-500 hover:bg-emerald-50/50"
          >
            <div className="inline-flex size-11 items-center justify-center rounded-full bg-white dark:bg-slate-300 text-slate-500 shadow-sm transition group-hover:text-emerald-700">
              <UploadCloud className="size-5" />
            </div>

            <span className="mt-3 text-sm font-semibold text-muted-foreground">
              Click to select an Excel file
            </span>

            <span className="mt-1 text-xs text-slate-500">XLSX or XLS</span>
          </label>
        ) : (
          <div className="rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50/60 dark:bg-emerald-900/40 p-4">
            <div className="flex items-start gap-3">
              <div className="inline-flex size-10 shrink-0 items-center justify-center rounded-lg bg-white text-emerald-700 shadow-sm">
                <FileSpreadsheet className="size-5" />
              </div>

              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-muted-foreground">
                  {state.file?.name}
                </p>

                <p className="mt-1 text-xs text-slate-500">
                  {formatFileSize(state.file?.size ?? 0)}
                </p>
              </div>

              {!state.loading && (
                <button
                  type="button"
                  onClick={clearSelectedFile}
                  className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg text-slate-500 transition hover:bg-white dark:hover:bg-slate-600 hover:text-red-600"
                  aria-label="Remove selected file"
                >
                  <X className="size-4" />
                </button>
              )}
            </div>

            <label
              htmlFor={inputId}
              className="mt-3 inline-flex cursor-pointer text-xs font-medium text-emerald-700 hover:text-emerald-800"
            >
              Choose a different file
            </label>
          </div>
        )}
      </div>

      <p className="mt-3 text-xs leading-5 text-slate-500">
        {config.helperText}
      </p>

      <div className="mt-auto pt-5">
        <button
          type="button"
          disabled={!state.file || state.loading}
          onClick={() => onUpload(config.type)}
          className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 text-sm font-semibold text-white transition hover:bg-slate-700 dark:hover:bg-slate-950 disabled:cursor-not-allowed disabled:bg-slate-300 dark:disabled:bg-slate-600 dark:disabled:hover:bg-slate-600"
        >
          {state.loading ? (
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
        </button>

        {state.message && (
          <div className="mt-3 flex items-start gap-2 rounded-xl border bg-emerald-50 dark:bg-emerald-900 px-3 py-2.5 text-sm text-emerald-800 dark:text-emerald-400">
            <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
            <span>{state.message}</span>
          </div>
        )}

        {state.error && (
          <div className="mt-3 rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/50 px-3 py-2.5 text-sm text-red-700 dark:text-red-400">
            {state.error}
          </div>
        )}
      </div>
    </article>
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
