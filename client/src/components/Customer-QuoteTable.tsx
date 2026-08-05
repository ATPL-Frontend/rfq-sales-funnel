"use client";

import { Clipboard, RotateCcw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { formatCurrency } from "../lib/BuySaleCalculations";
import type {
  CalculatedQuoteLine,
  QuoteLine,
  QuoteSettings,
} from "../types/buySale.types";

type Props = {
  lines: CalculatedQuoteLine[];
  settings: QuoteSettings;
  saving: boolean;

  onSave: () => void;
  onCopy: () => void;
  onClear: () => void;

  onUpdate: <K extends keyof QuoteLine>(
    id: string,
    field: K,
    value: QuoteLine[K],
  ) => void;
};

export function CustomerQuoteTable({
  lines,
  settings,
  onCopy,
  onClear,
  onUpdate,
  saving,
  onSave,
}: Props) {
  return (
    <section className="overflow-hidden rounded-xl border bg-white dark:bg-slate-800 shadow-sm">
      <div className="flex flex-col gap-3 border-b bg-white dark:bg-slate-800 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-semibold">Customer quotation</h2>

            <span className="inline-flex min-w-6 items-center justify-center rounded-full bg-primary px-2 py-0.5 text-xs font-semibold text-white">
              {lines.length}
            </span>
          </div>

          <p className="mt-1 text-sm text-slate-500">
            Review customer-facing information, then copy the formatted table
            into Outlook.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            onClick={onSave}
            disabled={saving}
            className="h-9 gap-2 bg-blue-600 hover:bg-blue-500"
          >
            {saving ? "Saving..." : "Save quotation"}
          </Button>

          <Button
            type="button"
            variant="destructive"
            onClick={onClear}
            className="h-9 gap-2"
          >
            <RotateCcw className="size-4" />
            Clear
          </Button>

          <Button type="button" onClick={onCopy} className="h-9 gap-2">
            <Clipboard className="size-4" />
            Copy quote
          </Button>
        </div>
      </div>

      <div
        className="overflow-x-auto
          dark:[&::-webkit-scrollbar]:h-2.5
          [&::-webkit-scrollbar-track]:bg-slate-400 
          [&::-webkit-scrollbar-thumb]:bg-slate-900 
          [&::-webkit-scrollbar-thumb]:rounded-full"
      >
        <table
          id="customer-quote-table"
          className="w-full min-w-[928px] table-fixed border-collapse text-xs"
        >
          <colgroup>
            <col className="w-30" />
            <col className="w-30" />
            <col className="w-50" />
            <col className="w-8" />
            <col className="w-18" />
            <col className="w-18" />
            <col className="w-16" />
            <col className="w-24" />
          </colgroup>

          <thead>
            <tr className="border-b bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
              <HeaderCell>Ampec P/N</HeaderCell>
              <HeaderCell>Cust P/N</HeaderCell>
              <HeaderCell>Description</HeaderCell>
              <HeaderCell>Qty</HeaderCell>

              <HeaderCell className="bg-red-50 dark:bg-red-800/50 text-red-700 dark:text-red-300">
                <span className="block">U/P</span>
                <span className="font-normal">AUD, ex GST</span>
              </HeaderCell>

              <HeaderCell>L/T</HeaderCell>
              <HeaderCell>NCNR?</HeaderCell>
              <HeaderCell>Remark</HeaderCell>
            </tr>
          </thead>

          <tbody className="divide-y">
            {lines.map((line) => (
              <tr
                key={line.id}
                className="bg-white dark:bg-slate-800 align-middle transition-colors hover:bg-slate-50 dark:hover:bg-slate-700"
              >
                <ReadOnlyCell>{line.ampecPartNumber}</ReadOnlyCell>

                <ReadOnlyCell>{line.customerPartNumber}</ReadOnlyCell>

                <ReadOnlyCell className="text-left">
                  {line.description}
                </ReadOnlyCell>

                <ReadOnlyCell>{line.requiredQuantity || ""}</ReadOnlyCell>

                <td className="border-r bg-emerald-50 dark:bg-emerald-800/50 px-2 py-2 text-center font-semibold text-emerald-900 dark:text-emerald-300">
                  {formatCurrency(line.finalUnitPriceAud, "AUD")}
                </td>

                <EditableQuoteCell
                  value={line.leadTime}
                  placeholder="e.g. 2 weeks"
                  onChange={(value) => onUpdate(line.id, "leadTime", value)}
                  className="text-center"
                />

                <td className="border-r p-1">
                  <select
                    value={line.ncnr}
                    onChange={(event) =>
                      onUpdate(line.id, "ncnr", event.target.value)
                    }
                    className="h-8 w-full rounded border border-slate-300 bg-white dark:bg-slate-800 px-2 text-xs outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-100"
                  >
                    <option value="">Select</option>
                    <option value="Yes">Yes</option>
                    <option value="No">No</option>
                  </select>
                </td>

                <EditableQuoteCell
                  value={line.remark}
                  placeholder="Customer remark"
                  onChange={(value) => onUpdate(line.id, "remark", value)}
                />
              </tr>
            ))}

            <tr className="bg-slate-50 dark:bg-slate-700">
              <td colSpan={2} className="border-r px-2 py-2" />

              <td className="border-r px-2 py-2 text-center font-semibold text-slate-800 dark:text-slate-300">
                Freight &amp; Handling
              </td>

              <td className="border-r px-2 py-2 text-center font-medium">1</td>

              <td className="border-r bg-yellow-100 dark:bg-yellow-300/40 px-2 py-2 text-center">
                <div className="font-semibold text-slate-900">
                  {formatCurrency(settings.freightCharge, "AUD")}
                </div>

                <div className="mt-0.5 text-[10px] italic leading-3 text-slate-600 dark:text-slate-700">
                  {settings.freightNote}
                </div>
              </td>

              <td colSpan={3} className="px-2 py-2" />
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  );
}

function HeaderCell({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <th
      scope="col"
      className={`border-r px-2 py-2.5 text-center text-[11px] font-semibold uppercase leading-4 tracking-wide last:border-r-0 ${className}`}
    >
      {children}
    </th>
  );
}

function ReadOnlyCell({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <td
      className={`border-r px-1 py-2 text-center text-xs text-slate-700 dark:text-slate-300 ${className}`}
    >
      <div className="line-clamp-2 leading-4">{children}</div>
    </td>
  );
}

function EditableQuoteCell({
  value,
  placeholder,
  onChange,
  className = "",
}: {
  value: string;
  placeholder?: string;
  onChange: (value: string) => void;
  className?: string;
}) {
  return (
    <td className="border-r p-1">
      <input
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className={`h-8 w-full rounded border px-1 text-xs outline-none dark:outline-slate-400 transition focus:border-2 focus:ring-border-500 ${className}`}
      />
    </td>
  );
}
