"use client";

import { PackageSearch, RefreshCcw, Search, UploadCloud } from "lucide-react";
import { useCallback, useState } from "react";

import { getBuySaleItems } from "@/api/buySaleList.api";
import { BuySaleUploadSection } from "@/components/BuySaleUploadSection";
import { InfiniteScrollSentinel } from "@/components/InfiniteScrollSentinel";
import { Button } from "@/components/ui/button";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { useInfiniteCursorList } from "@/hooks/useInfiniteCursorList";
import { toNumber } from "@/lib/BuySaleCalculations";
import type { UploadState, UploadType } from "@/types/buySale.types";
import type { BuySaleItemListRow } from "@/types/buySaleList.types";
import {
  createInitialUploads,
  getErrorMessage,
  uploadBuySaleExcel,
} from "./BuySale";

function text(value: string | number | null | undefined) {
  return value === null || value === undefined ? "" : String(value);
}

function number(value: number | null | undefined, digits = 4) {
  if (value === null || value === undefined) return "";
  return Number(value).toLocaleString("en-AU", {
    maximumFractionDigits: digits,
  });
}

export default function BuySaleItemListPage() {
  const [search, setSearch] = useState("");
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [stockSheet, setStockSheet] = useState("Kunshan");
  const [uploads, setUploads] = useState<Record<UploadType, UploadState>>(() =>
    createInitialUploads(),
  );
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
    }) => getBuySaleItems({ search: value, cursor, limit: 30, signal }),
    [],
  );

  const {
    items,
    totalCount,
    hasMore,
    loading,
    initialLoading,
    error,
    loadMore,
    reload,
  } = useInfiniteCursorList<BuySaleItemListRow>({
    search: debouncedSearch,
    fetchPage,
  });

  const updateUploadFile = useCallback(
    (type: UploadType, file: File | null) => {
      setUploads((current) => ({
        ...current,
        [type]: {
          ...current[type],
          file,
          message: "",
          error: "",
        },
      }));
    },
    [],
  );

  const uploadExcel = useCallback(
    async (type: UploadType) => {
      const uploadState = uploads[type];

      if (!uploadState.file || uploadState.loading) {
        return;
      }

      setUploads((current) => ({
        ...current,
        [type]: {
          ...current[type],
          loading: true,
          message: "",
          error: "",
        },
      }));

      try {
        const response = await uploadBuySaleExcel({
          type,
          file: uploadState.file,
          sheetName: type === "stock" ? stockSheet : undefined,
        });

        if (!response.success || !response.data) {
          throw new Error(response.message || "Excel upload failed.");
        }

        const importedRows = toNumber(response.data.imported_rows);

        let successMessage =
          response.message || `${importedRows} rows imported successfully.`;

        if (type === "stock" && response.data.sheet_name) {
          successMessage += ` Sheet: ${response.data.sheet_name}.`;
        }

        if (type === "price" && response.data.price_list_date) {
          successMessage += ` Price list date: ${response.data.price_list_date}.`;
        }

        setUploads((current) => ({
          ...current,
          [type]: {
            file: null,
            loading: false,
            message: successMessage,
            error: "",
          },
        }));
      } catch (error: unknown) {
        setUploads((current) => ({
          ...current,
          [type]: {
            ...current[type],
            loading: false,
            message: "",
            error: getErrorMessage(error, "Excel upload failed."),
          },
        }));
      }
    },
    [stockSheet, uploads],
  );

  return (
    <main className="space-y-4">
      <section className="overflow-hidden rounded-xl border bg-white shadow-sm dark:bg-slate-800">
        <div className="flex flex-col gap-3 border-b px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <PackageSearch className="size-5 text-slate-500" />
              <h1 className="text-lg font-semibold">Buy-Sale item list</h1>
              <span className="inline-flex min-w-7 items-center justify-center rounded-full bg-primary px-2 py-0.5 text-xs font-semibold text-white">
                {totalCount.toLocaleString()}
              </span>
            </div>
            <p className="mt-1 text-sm text-slate-500">
              Combined mapping, price-list and stock data. Missing values stay
              blank.
            </p>
          </div>

          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={reload}
              disabled={loading}
              className="h-9 gap-2"
            >
              <RefreshCcw
                className={`size-4 ${loading ? "animate-spin" : ""}`}
              />
              Refresh
            </Button>

            <Button
              type="button"
              onClick={() => setUploadModalOpen(true)}
              className=""
            >
              <UploadCloud className="size-4" />
              Update Data
            </Button>
          </div>
        </div>

        <div className="border-b bg-slate-50 px-4 py-3 dark:bg-slate-900/40">
          <div className="relative max-w-xl">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search item, captive part, description, family or location..."
              className="h-9 w-full rounded-lg border bg-white pl-9 pr-3 text-sm outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200 dark:bg-slate-800 dark:focus:ring-slate-700"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1250px] border-collapse text-xs">
            <thead className="sticky top-0 z-10">
              <tr className="border-b bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-200">
                <Header>Item / Product</Header>
                <Header>Captive P/N</Header>
                <Header>Description</Header>
                <Header>Family</Header>
                <Header>Bag Qty</Header>
                <Header>Carton Qty</Header>
                <Header>Bag / 1,000</Header>
                <Header>Carton / 1,000</Header>
                <Header>Stock</Header>
                <Header>Location</Header>
                <Header>Price update</Header>
              </tr>
            </thead>

            <tbody className="divide-y">
              {items.map((item) => (
                <tr
                  key={item.normalized_part_number}
                  className="bg-white align-middle hover:bg-slate-50 dark:bg-slate-800 dark:hover:bg-slate-700"
                >
                  <Cell className="font-semibold text-left">
                    {text(item.item_number)}
                  </Cell>
                  <Cell className="text-left">
                    {text(item.captive_part_numbers)}
                  </Cell>
                  <Cell className="min-w-64 text-left">
                    {text(item.description)}
                  </Cell>
                  <Cell>{text(item.product_family)}</Cell>
                  <Cell className="text-right">
                    {number(item.bag_quantity, 0)}
                  </Cell>
                  <Cell className="text-right">
                    {number(item.carton_quantity, 0)}
                  </Cell>
                  <Cell className="text-right">
                    {number(item.standard_price_per_1000)}
                  </Cell>
                  <Cell className="text-right">
                    {number(item.carton_price_per_1000)}
                  </Cell>
                  <Cell className="text-right">
                    {number(item.nett_inventory)}
                  </Cell>
                  <Cell>{text(item.stock_locations)}</Cell>
                  <Cell>
                    {item.price_list_date
                      ? new Date(item.price_list_date).toLocaleDateString(
                          "en-AU",
                        )
                      : ""}
                  </Cell>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {initialLoading ? <Status>Loading items...</Status> : null}
        {!initialLoading && !items.length && !error ? (
          <Status>No items found.</Status>
        ) : null}
        {error ? <Status className="text-red-600">{error}</Status> : null}

        <InfiniteScrollSentinel
          disabled={!hasMore || loading}
          onVisible={loadMore}
        />

        {!initialLoading && loading ? (
          <Status>Loading more items...</Status>
        ) : null}
        {!initialLoading && items.length > 0 && !hasMore ? (
          <Status>
            All {items.length.toLocaleString()} loaded items are shown.
          </Status>
        ) : null}
      </section>

      <BuySaleUploadSection
        open={uploadModalOpen}
        stockSheet={stockSheet}
        uploads={uploads}
        onClose={() => setUploadModalOpen(false)}
        onStockSheetChange={setStockSheet}
        onFileChange={updateUploadFile}
        onUpload={uploadExcel}
      />
    </main>
  );
}

function Header({ children }: { children: React.ReactNode }) {
  return (
    <th className="border-r px-2 py-3 text-center text-[11px] font-semibold uppercase tracking-wide last:border-r-0">
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
      className={`border-r px-2 py-2 text-center text-slate-700 last:border-r-0 dark:text-slate-300 ${className}`}
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
