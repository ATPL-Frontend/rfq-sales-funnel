import CablePriceModal from "@/components/modal/CablePriceModal";
import { Modal } from "@/components/modal/Modal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import api from "@/lib/api";
import {
  Cable,
  FileSpreadsheet,
  Loader2,
  Search,
  UploadCloud,
} from "lucide-react";
import type { FormEvent } from "react";
import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";

type ParsedCableSearch = {
  input: string;
  vendor_code: string;
  cable_standard: string | null;
  awg: number | null;
  color_codes: string[];
  color_names: string[];
};

type CablePriceResult = {
  id: number;
  vendor_code: string;
  cable_standard: string;
  section_name: string | null;
  description: string;
  color_name: string | null;
  unit_price: number | string;
  currency: string;
  price_basis: string | null;
  packing_roll: string | null;
  moq: string | null;
  file_name: string;
  sheet_name: string;
  source_row: number | null;
  imported_at: string;
};

type CablePriceSummary = {
  total_items: number | string;
  total_standards: number | string;
  total_sheets: number | string;
  imported_at: string | null;
  file_name: string | null;
};

export default function CablePricePage() {
  const [search, setSearch] = useState("");
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<CablePriceResult[]>([]);
  const [parsed, setParsed] = useState<ParsedCableSearch | null>(null);
  const [searchedQuery, setSearchedQuery] = useState("");
  const [summary, setSummary] = useState<CablePriceSummary | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);

  // =========================================
  // LOAD CURRENT DATA SUMMARY
  // =========================================
  const fetchSummary = useCallback(async () => {
    setSummaryLoading(true);

    try {
      const { data } = await api.get("/api/cable-prices/summary");

      setSummary(data?.data || null);
    } catch {
      setSummary(null);
    } finally {
      setSummaryLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  // =========================================
  // SEARCH
  // =========================================
  const runSearch = useCallback(async (query: string, showLoading = true) => {
    const q = query.trim();

    if (!q) {
      setResults([]);
      setParsed(null);
      setSearchedQuery("");

      return;
    }

    if (showLoading) {
      setSearching(true);
    }

    try {
      const { data } = await api.get("/api/cable-prices/search", {
        params: {
          q,
        },
      });

      setResults(data?.data || []);

      setParsed(data?.parsed || null);

      setSearchedQuery(q);
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message || "Failed to search cable prices.",
      );
    } finally {
      if (showLoading) {
        setSearching(false);
      }
    }
  }, []);

  const handleSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    void runSearch(search);
  };

  const clearSearch = () => {
    setSearch("");
    setResults([]);
    setParsed(null);
    setSearchedQuery("");
  };

  // =========================================
  // AFTER NEW EXCEL IMPORT
  // =========================================
  const handleUploadSuccess = useCallback(async () => {
    await fetchSummary();

    if (search.trim()) {
      await runSearch(search, false);
    }
  }, [fetchSummary, runSearch, search]);

  return (
    <section className="space-y-4">
      {/* =====================================
          HEADER
      ====================================== */}
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2">
            <Cable className="size-5 text-primary" />

            <h1 className="text-xl font-semibold">Cable Price</h1>
          </div>

          <p className="mt-1 text-sm text-muted-foreground">
            Search the current 3F cable price list.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* CURRENT DATA SUMMARY */}
          {summaryLoading ? (
            <Badge variant="secondary" className="gap-1.5">
              <Loader2 className="size-3 animate-spin" />
              Loading data
            </Badge>
          ) : summary && Number(summary.total_items) > 0 ? (
            <>
              <Badge variant="secondary">
                {Number(summary.total_items).toLocaleString()} Items
              </Badge>

              <Badge variant="secondary">
                {Number(summary.total_standards).toLocaleString()} Standards
              </Badge>

              <Badge variant="secondary">
                {Number(summary.total_sheets).toLocaleString()} Sheets
              </Badge>
            </>
          ) : null}

          {/* UPLOAD MODAL */}
          <Modal
            type="button"
            icon={<UploadCloud className="size-4" />}
            label="Update Data"
            title="Update 3F Cable Price Data"
            size="xl"
          >
            {(closeModal) => (
              <CablePriceModal
                summary={summary}
                onCancel={closeModal}
                onSuccess={async () => {
                  await handleUploadSuccess();

                  closeModal();
                }}
              />
            )}
          </Modal>
        </div>
      </div>

      {/* =====================================
          SEARCH CARD
      ====================================== */}
      <div className="rounded-xl border bg-card p-4 shadow-sm">
        <form
          onSubmit={handleSearch}
          className="flex flex-col gap-2 sm:flex-row"
        >
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />

            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search cable e.g. AHW18UL1007BK-3F"
              className="pl-9"
            />
          </div>

          {search && (
            <Button type="button" variant="secondary" onClick={clearSearch}>
              Clear
            </Button>
          )}

          <Button type="submit" disabled={searching || !search.trim()}>
            {searching ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Searching...
              </>
            ) : (
              <>
                <Search className="size-4" />
                Search
              </>
            )}
          </Button>
        </form>

        {/* PARSED SEARCH INFORMATION */}
        {parsed && (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="mr-1 text-xs text-muted-foreground">
              Searching for:
            </span>

            <Badge variant="secondary">Vendor: {parsed.vendor_code}</Badge>

            {parsed.cable_standard && (
              <Badge variant="secondary">
                Standard: {parsed.cable_standard}
              </Badge>
            )}

            {parsed.awg !== null && (
              <Badge variant="secondary">AWG: {parsed.awg}</Badge>
            )}

            {parsed.color_names.map((color, index) => (
              <Badge key={`${color}-${index}`} variant="outline">
                Color: {color}
              </Badge>
            ))}
          </div>
        )}
      </div>

      {/* =====================================
          RESULTS
      ====================================== */}
      {searchedQuery && (
        <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
          <div className="flex flex-col justify-between gap-2 border-b px-4 py-3 sm:flex-row sm:items-center">
            <div>
              <h2 className="font-semibold">Matching Cable Prices</h2>

              <p className="mt-0.5 text-xs text-muted-foreground">
                Results from the current uploaded 3F price list.
              </p>
            </div>

            <Badge variant="secondary">
              {results.length} {results.length === 1 ? "Result" : "Results"}
            </Badge>
          </div>

          {results.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full border-collapse text-sm">
                <thead className="bg-muted/50 text-xs">
                  <tr>
                    <th className="whitespace-nowrap px-4 py-3 text-left font-medium">
                      Standard
                    </th>

                    <th className="whitespace-nowrap px-4 py-3 text-left font-medium">
                      AWG / Description
                    </th>

                    <th className="whitespace-nowrap px-4 py-3 text-left font-medium">
                      Color
                    </th>

                    <th className="whitespace-nowrap px-4 py-3 text-right font-medium">
                      Price
                    </th>

                    <th className="whitespace-nowrap px-4 py-3 text-left font-medium">
                      Price Range
                    </th>

                    <th className="whitespace-nowrap px-4 py-3 text-left font-medium">
                      Packing / Roll
                    </th>

                    <th className="whitespace-nowrap px-4 py-3 text-left font-medium">
                      MOQ
                    </th>

                    <th className="whitespace-nowrap px-4 py-3 text-left font-medium">
                      Source
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {results.map((row) => (
                    <tr
                      key={row.id}
                      className="border-t transition-colors hover:bg-muted/30"
                    >
                      {/* STANDARD */}
                      <td className="px-4 py-3 align-top">
                        <Badge variant="secondary">{row.cable_standard}</Badge>
                      </td>

                      {/* DESCRIPTION */}
                      <td className="min-w-80 max-w-xl px-4 py-3 align-top">
                        <p className="font-medium">{row.description}</p>

                        {row.section_name &&
                          row.section_name !== row.cable_standard && (
                            <p className="mt-1 text-xs text-muted-foreground">
                              {row.section_name}
                            </p>
                          )}
                      </td>

                      {/* COLOR */}
                      <td className="whitespace-nowrap px-4 py-3 align-top">
                        {row.color_name || "-"}
                      </td>

                      {/* PRICE */}
                      <td className="whitespace-nowrap px-4 py-3 text-right align-top">
                        <span className="font-semibold">
                          {formatPrice(row.unit_price)}
                        </span>

                        <span className="ml-1 text-xs font-medium text-muted-foreground">
                          {row.currency}
                        </span>
                      </td>

                      {/* PRICE BASIS */}
                      <td className="whitespace-nowrap px-4 py-3 align-top">
                        {row.price_basis ? (
                          <Badge variant="outline">{row.price_basis}</Badge>
                        ) : (
                          "-"
                        )}
                      </td>

                      <td className="whitespace-nowrap px-4 py-3 align-top">
                        {row.packing_roll || "-"}
                      </td>

                      <td className="whitespace-nowrap px-4 py-3 align-top">
                        {row.moq || "-"}
                      </td>

                      {/* SOURCE */}
                      <td className="px-4 py-3 align-top">
                        <div className="flex min-w-44 items-start gap-2">
                          <FileSpreadsheet className="mt-0.5 size-4 shrink-0 text-emerald-600" />

                          <div className="min-w-0">
                            <p className="max-w-48 truncate text-xs font-medium">
                              {row.sheet_name}
                            </p>

                            {row.source_row && (
                              <p className="mt-0.5 text-xs text-muted-foreground">
                                Row {row.source_row}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="flex min-h-48 flex-col items-center justify-center px-4 py-10 text-center">
              <Search className="size-8 text-muted-foreground/50" />

              <p className="mt-3 text-sm font-medium">No cable price found</p>

              <p className="mt-1 max-w-md text-xs text-muted-foreground">
                No current 3F cable data matched "{searchedQuery}".
              </p>
            </div>
          )}
        </div>
      )}
    </section>
  );
}

function formatPrice(value: number | string) {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return String(value);
  }

  return number.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 6,
  });
}
