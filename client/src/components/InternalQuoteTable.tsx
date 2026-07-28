"use client";

import { Plus } from "lucide-react";

import { InternalQuoteRow } from "@/components/InternalQuoteRow";
import { Button } from "@/components/ui/button";

import type {
  CalculatedQuoteLine,
  PriceType,
  QuoteLine,
} from "@/types/buySale.types";

type Props = {
  lines: CalculatedQuoteLine[];
  onAdd: () => void;
  onRemove: (id: string) => void;
  onSearch: (id: string, partNumber: string) => void;

  onUpdate: <K extends keyof QuoteLine>(
    id: string,
    field: K,
    value: QuoteLine[K],
  ) => void;

  onRequiredQuantityChange: (id: string, quantity: number) => void;

  onPriceTypeChange: (id: string, priceType: PriceType) => void;
};

export function InternalQuoteTable({
  lines,
  onAdd,
  onRemove,
  onSearch,
  onUpdate,
  onRequiredQuantityChange,
  onPriceTypeChange,
}: Props) {
  return (
    <section className="overflow-hidden rounded-xl border bg-white dark:bg-slate-800 shadow-sm">
      <div className="flex flex-col gap-3 border-b px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-semibold">
              Internal calculation
            </h2>

            <span className="inline-flex min-w-6 items-center justify-center rounded-full bg-primary px-2 py-0.5 text-xs font-semibold text-white">
              {lines.length}
            </span>
          </div>

          <p className="mt-1 text-sm text-slate-500">
            Search a part, enter the required quantity and review the calculated
            selling price.
          </p>
        </div>
      </div>

      <div className="border-b bg-slate-50 px-4 py-2 dark:bg-slate-700">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
          <span>
            <strong className="font-semibold text-slate-700 dark:text-slate-200">Standard:</strong>{" "}
            used below carton quantity
          </span>

          <span>
            <strong className="font-semibold text-slate-700 dark:text-slate-200">Carton:</strong>{" "}
            used when quantity reaches carton threshold
          </span>

          <span>
            <strong className="font-semibold text-slate-700 dark:text-slate-200">Red stock:</strong>{" "}
            insufficient quantity
          </span>
        </div>
      </div>

      <div className="overflow-x-auto  
            dark:[&::-webkit-scrollbar]:h-2.5
            [&::-webkit-scrollbar-track]:bg-slate-400 
            [&::-webkit-scrollbar-thumb]:bg-slate-900 
            [&::-webkit-scrollbar-thumb]:rounded-full">
        <table className="w-full min-w-[1420px] table-fixed border-collapse text-xs">
          <colgroup>
            <col className="w-40" />
            <col className="w-30" />
            <col className="w-30" />
            <col className="w-15" />
            <col className="w-57" /> 
            <col className="w-18" />
            <col className="w-19" />
            <col className="w-30" />
            <col className="w-20" />
            <col className="w-22" />
            <col className="w-22" />
            <col className="w-20" />
            <col className="w-20" />
            <col className="w-20" />
            <col className="w-36" />
            <col className="w-8" />
          </colgroup>

          <thead className="sticky top-0 z-10">
            <tr className="border-b bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200">
              <HeaderCell className="sticky left-0 z-20 bg-slate-100 dark:bg-slate-700">
                Part search
              </HeaderCell>

              <HeaderCell>Ampec P/N</HeaderCell>
              <HeaderCell>Customer P/N</HeaderCell>
              <HeaderCell>Rev</HeaderCell>
              <HeaderCell>Description</HeaderCell>
              <HeaderCell>Qty</HeaderCell>
              <HeaderCell>
                Stock <span className="font-normal text-slate-500 dark:text-slate-400">(Kunshan)</span>
              </HeaderCell>
              <HeaderCell>Price source</HeaderCell>

              <HeaderCell>
                <span className="block">Item price</span>
                <span className="font-normal text-slate-500 dark:text-slate-400">USD</span>
              </HeaderCell>

              <HeaderCell>
                <span className="block">Converted</span>
                <span className="font-normal text-slate-500 dark:text-slate-400">AUD</span>
              </HeaderCell>

              <HeaderCell>
                <span className="block">After component</span>
                <span className="font-normal text-slate-500 dark:text-slate-400">margin</span>
              </HeaderCell>

              <HeaderCell className="bg-emerald-50 dark:bg-emerald-900 text-emerald-900 dark:text-emerald-100">
                <span className="block">Final U/P</span>
                <span className="font-normal text-emerald-700 dark:text-emerald-400">AUD</span>
              </HeaderCell>

              <HeaderCell>
                <span className="block">Final U/P</span>
                <span className="font-normal text-slate-500 dark:text-slate-400">USD</span>
              </HeaderCell>

              <HeaderCell>MOQ</HeaderCell>
              <HeaderCell>Remark</HeaderCell>
              <HeaderCell>
                <span className="sr-only">Action</span>
              </HeaderCell>
            </tr>
          </thead>

          <tbody className="divide-y">
            {lines.map((line, index) => (
              <InternalQuoteRow
                key={line.id}
                line={line}
                rowNumber={index + 1}
                onSearch={(partNumber) => onSearch(line.id, partNumber)}
                onRemove={() => onRemove(line.id)}
                onUpdate={(field, value) => onUpdate(line.id, field, value)}
                onRequiredQuantityChange={(quantity) =>
                  onRequiredQuantityChange(line.id, quantity)
                }
                onPriceTypeChange={(priceType) =>
                  onPriceTypeChange(line.id, priceType)
                }
              />
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between border-t bg-slate-50 dark:bg-slate-800 px-4 py-3">
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Scroll horizontally to view all calculation columns.
        </p>

        <Button
          type="button"
          size="sm"
          onClick={onAdd}
          className="gap-2"
        >
          <Plus className="size-3.5" />
          Add another item
        </Button>
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
      className={`border-r px-2 py-3 text-center text-[11px] font-semibold uppercase leading-4 tracking-wide last:border-r-0 ${className}`}
    >
      {children}
    </th>
  );
}
