"use client";

import { FileText, RefreshCcw, Search } from "lucide-react";
import { useCallback, useState } from "react";

import { getSavedBuySaleQuotations } from "@/api/buySaleList.api";
import { InfiniteScrollSentinel } from "@/components/InfiniteScrollSentinel";
import { Button } from "@/components/ui/button";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { useInfiniteCursorList } from "@/hooks/useInfiniteCursorList";
import type { SavedQuotationListRow } from "@/types/buySaleList.types";

function text(value: string | number | null | undefined) {
  return value === null || value === undefined ? "" : String(value);
}

function aud(value: number) {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return "";
  return `$${amount.toLocaleString("en-AU", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 6,
  })}`;
}

export default function SavedQuotationListPage() {
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 400);

  const fetchPage = useCallback(
    ({
      search: value,
      cursor,
      signal,
    }: {
      search: string;
      cursor: string | null;
      signal: AbortSignal;
    }) =>
      getSavedBuySaleQuotations({ search: value, cursor, limit: 30, signal }),
    [],
  );

  const { items, totalCount, hasMore, loading, initialLoading, error, loadMore, reload } =
    useInfiniteCursorList<SavedQuotationListRow>({
      search: debouncedSearch,
      fetchPage,
    });

  return (
    <main className="space-y-4">
      <section className="overflow-hidden rounded-xl border bg-white shadow-sm dark:bg-slate-800">
        <div className="flex flex-col gap-3 border-b px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <FileText className="size-5 text-slate-500" />
              <h1 className="text-lg font-semibold">Saved quotation list</h1>
              <span className="inline-flex min-w-7 items-center justify-center rounded-full bg-primary px-2 py-0.5 text-xs font-semibold text-white">
                {totalCount.toLocaleString()}
              </span>
            </div>
            <p className="mt-1 text-sm text-slate-500">
              Customer-facing quotation rows saved from the Buy-Sale page.
            </p>
          </div>

          <Button
            type="button"
            variant="outline"
            onClick={reload}
            disabled={loading}
            className="h-9 gap-2"
          >
            <RefreshCcw className={`size-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>

        <div className="border-b bg-slate-50 px-4 py-3 dark:bg-slate-900/40">
          <div className="relative max-w-xl">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search Ampec P/N, customer P/N, description, lead time or remark..."
              className="h-9 w-full rounded-lg border bg-white pl-9 pr-3 text-sm outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200 dark:bg-slate-800 dark:focus:ring-slate-700"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1100px] border-collapse text-xs">
            <thead className="sticky top-0 z-10">
              <tr className="border-b bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-200">
                {/* <Header>ID</Header> */}
                <Header>Ampec P/N</Header>
                <Header>Cust P/N</Header>
                <Header>Description</Header>
                <Header>Qty</Header>
                <Header>U/P AUD ex GST</Header>
                <Header>L/T</Header>
                <Header>NCNR</Header>
                <Header>Remark</Header>
                <Header>Created</Header>
              </tr>
            </thead>

            <tbody className="divide-y">
              {items.map((item) => (
                <tr
                  key={item.id}
                  className="bg-white align-middle hover:bg-slate-50 dark:bg-slate-800 dark:hover:bg-slate-700"
                >
                  {/* <Cell className="font-semibold">{item.id}</Cell> */}
                  <Cell className="text-left">
                    {text(item.ampec_part_number)}
                  </Cell>
                  <Cell className="text-left">
                    {text(item.customer_part_number)}
                  </Cell>
                  <Cell className="min-w-64 text-left">
                    {text(item.description)}
                  </Cell>
                  <Cell className="text-right">
                    {Number(item.quantity).toLocaleString("en-AU")}
                  </Cell>
                  <Cell className="font-semibold text-right text-emerald-700 dark:text-emerald-300">
                    {aud(item.unit_price_aud_ex_gst)}
                  </Cell>
                  <Cell className="text-left">{text(item.lead_time)}</Cell>
                  <Cell>{text(item.ncnr)}</Cell>
                  <Cell className="min-w-48 text-left">
                    {text(item.remark)}
                  </Cell>
                  <Cell>
                    {new Date(item.created_at).toLocaleString("en-AU")}
                  </Cell>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {initialLoading ? <Status>Loading quotations...</Status> : null}
        {!initialLoading && !items.length && !error ? (
          <Status>No saved quotations found.</Status>
        ) : null}
        {error ? <Status className="text-red-600">{error}</Status> : null}

        <InfiniteScrollSentinel
          disabled={!hasMore || loading}
          onVisible={loadMore}
        />

        {!initialLoading && loading ? (
          <Status>Loading more quotations...</Status>
        ) : null}
        {!initialLoading && items.length > 0 && !hasMore ? (
          <Status>
            All {items.length.toLocaleString()} loaded quotation rows are shown.
          </Status>
        ) : null}
      </section>
    </main>
  );
}

function Header({ children }: { children: React.ReactNode }) {
  return (
    <th className="border-r px-2 py-3 text-center text-[12px] font-semibold uppercase tracking-wide last:border-r-0">
      {children}
    </th>
  );
}

function Cell({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <td
      className={`border-r px-2 py-2 text-xs text-center text-muted-foreground last:border-r-0  ${className}`}
    >
      <div className="line-clamp-2 leading-4">{children}</div>
    </td>
  );
}

function Status({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`border-t px-4 py-3 text-center text-sm text-slate-500 ${className}`}
    >
      {children}
    </div>
  );
}
