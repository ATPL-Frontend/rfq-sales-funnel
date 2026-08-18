"use client";

import { Loader2, Search, Trash2 } from "lucide-react";

import { formatCurrency } from "@/lib/BuySaleCalculations";

import type {
  CalculatedQuoteLine,
  PriceType,
  QuoteLine,
} from "@/types/buySale.types";
import { useEffect, useRef } from "react";
import { NumberInput } from "./NumberInput";

type Props = {
  line: CalculatedQuoteLine;
  rowNumber: number;

  onUpdate: <K extends keyof QuoteLine>(field: K, value: QuoteLine[K]) => void;

  onRequiredQuantityChange: (quantity: number) => void;

  onSearch: (partNumber: string) => void;

  onRemove: () => void;

  onPriceTypeChange: (priceType: PriceType) => void;
};

export function InternalQuoteRow({
  line,
  // rowNumber,
  onUpdate,
  onRequiredQuantityChange,
  onSearch,
  onRemove,
  onPriceTypeChange,
}: Props) {
  const lastSearchedValueRef = useRef("");

  useEffect(() => {
    const partNumber = line.enteredPartNumber.trim();

    if (!partNumber) {
      lastSearchedValueRef.current = "";

      if (line.searchMessage) {
        onUpdate("searchMessage", "");
      }

      return;
    }

    const timeoutId = window.setTimeout(() => {
      if (partNumber === lastSearchedValueRef.current) {
        return;
      }

      lastSearchedValueRef.current = partNumber;
      onSearch(partNumber);
    }, 400);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [line.enteredPartNumber, line.searchMessage, onSearch, onUpdate]);

  return (
    <tr className="h-10 align-top transition-colors hover:bg-slate-50 dark:hover:bg-slate-700">
      <td className="sticky left-0 z-10 border-r p-1 bg-white dark:bg-slate-800">
        <div className="mb-1 flex items-center gap-1">
          {/* <span className="inline-flex size-5 shrink-0 items-center justify-center rounded bg-slate-100 text-[10px] font-semibold text-slate-500">
            {rowNumber}
          </span> */}

          <div className="relative min-w-0 flex-1">
            <input
              type="text"
              value={line.enteredPartNumber}
              placeholder="Enter part number"
              autoComplete="off"
              onChange={(event) => {
                const value = event.target.value;

                onUpdate("enteredPartNumber", value);
                onUpdate("ampecPartNumber", value);
              }}
              className="
                h-8 w-full rounded-md border border-slate-300
                bg-white dark:bg-slate-800 py-1 pl-2 pr-5 text-xs outline-none
                transition focus:border-emerald-500
                focus:ring-2 focus:ring-emerald-100
              "
            />

            <span className="pointer-events-none absolute inset-y-0 right-0 flex w-6 items-center justify-center">
              {line.searching ? (
                <Loader2 className="size-3.5 animate-spin text-slate-500" />
              ) : (
                <Search className="size-3.5 text-slate-500" />
              )}
            </span>
          </div>
        </div>

        {line.searchMessage && (
          <p
            className={`line-clamp-2 text-[11px] leading-4 ${
              line.searchMessage.toLowerCase().includes("failed") ||
              line.searchMessage.toLowerCase().includes("not found")
                ? "text-red-600 dark:text-red-400"
                : "text-emerald-700 dark:text-emerald-400"
            }`}
            title={line.searchMessage}
          >
            {line.searchMessage}
          </p>
        )}
      </td>

      <EditableCell
        value={line.ampecPartNumber}
        onChange={(value) => onUpdate("ampecPartNumber", value)}
      />

      <EditableCell
        value={line.customerPartNumber}
        onChange={(value) => onUpdate("customerPartNumber", value)}
      />

      <EditableCell
        value={line.description}
        onChange={(value) => onUpdate("description", value)}
        className="min-w-72"
      />

      <NumberInput
        value={line.requiredQuantity}
        min={0}
        step={1}
        onChange={onRequiredQuantityChange}
      />

      <td className="border p-1 text-center pt-3">
        <strong
          className={
            line.stockQuantity >= line.requiredQuantity
              ? "text-emerald-700 dark:text-emerald-400"
              : "text-red-600 dark:text-red-400"
          }
        >
          {line.stockQuantity.toLocaleString()}
        </strong>
      </td>

      <td className="border p-1 align-top">
        <select
          value={line.priceType}
          onChange={(event) =>
            onPriceTypeChange(event.target.value as PriceType)
          }
          className="h-8 w-full rounded border px-2 text-xs dark:bg-slate-800"
        >
          <option value="manual">Manual</option>

          <option value="standard" disabled={line.standardUnitPrice === null}>
            Standard price
          </option>

          <option value="carton" disabled={line.cartonUnitPrice === null}>
            Carton price
          </option>
        </select>

        {(line.bagQuantity !== null || line.cartonQuantity !== null) && (
          <p
            className="mt-0.5 truncate text-[10px] leading-3 text-slate-500 dark:text-slate-400"
            title={[
              line.bagQuantity !== null
                ? `Bag quantity: ${line.bagQuantity.toLocaleString()}`
                : "",
              line.cartonQuantity !== null
                ? `Carton price from: ${line.cartonQuantity.toLocaleString()} pcs`
                : "",
              line.standardPricePer1000 !== null
                ? `Standard: ${formatCurrency(
                    line.standardPricePer1000,
                    "USD",
                  )} / 1,000`
                : "",
              line.cartonPricePer1000 !== null
                ? `Carton: ${formatCurrency(
                    line.cartonPricePer1000,
                    "USD",
                  )} / 1,000`
                : "",
            ]
              .filter(Boolean)
              .join(" | ")}
          >
            {line.priceType === "carton"
              ? `From ${line.cartonQuantity?.toLocaleString() ?? "—"} pcs`
              : `Bag ${line.bagQuantity?.toLocaleString() ?? "—"} pcs`}
          </p>
        )}
      </td>

      <NumberInput
        value={line.itemPriceUsd}
        min={0}
        step={0.00001}
        onChange={(value) => onUpdate("itemPriceUsd", value)}
        className="w-18"
      />

      <CalculatedCell value={line.convertedPriceAud} currency="AUD" />

      <CalculatedCell value={line.componentSellingPriceAud} currency="AUD" />

      <CalculatedCell value={line.finalUnitPriceAud} currency="AUD" />

      <CalculatedCell value={line.finalUnitPriceUsd} currency="USD" />

      <NumberInput
        value={line.moq}
        min={0}
        step={1}
        onChange={(value) => onUpdate("moq", value)}
        className="w-full"
      />

      <EditableCell
        value={line.remark}
        onChange={(value) => onUpdate("remark", value)}
        className="min-w-52"
      />

      <td className="border p-1 text-center align-middle sticky right-0 z-10 bg-muted dark:bg-muted/80">
        <button
          type="button"
          onClick={onRemove}
          className="inline-flex size-6 items-center justify-center rounded text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-800/20"
        >
          <Trash2 className="size-4" />
        </button>
      </td>
    </tr>
  );
}

function EditableCell({
  value,
  onChange,
  className = "",
}: {
  value: string;
  onChange: (value: string) => void;
  className?: string;
}) {
  return (
    <td className={`border p-1 ${className}`}>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-8 w-full rounded border dark:focus:outline-slate-600 px-1"
      />
    </td>
  );
}

function CalculatedCell({
  value,
  currency,
}: {
  value: number;
  currency: "AUD" | "USD";
}) {
  return (
    <td className="border px-1 py-3 text-center dark:text-slate-300 font-semibold">
      {formatCurrency(value, currency)}
    </td>
  );
}
