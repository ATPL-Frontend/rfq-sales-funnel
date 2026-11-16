import CablePriceModal from "@/components/modal/CablePriceModal";
import { Modal } from "@/components/modal/Modal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import api from "@/lib/api";
import {
  Cable,
  FileSpreadsheet,
  Filter,
  Loader2,
  RotateCcw,
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
  awg: number | null;
  section_name: string | null;
  description: string;
  color_name: string | null;
  color_type: "single" | "dual" | null;
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

type FilterOptions = {
  cable_standards: string[];
  awgs: number[];
  color_types: {
    value: "single" | "dual";

    label: string;
  }[];
};

type CableFilters = {
  awg: string;
  cable_standard: string;
  color_type: string;
};

const initialFilters: CableFilters = {
  awg: "",
  cable_standard: "",
  color_type: "",
};

export default function CablePricePage() {
  const [search, setSearch] = useState("");
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<CablePriceResult[]>([]);
  const [parsed, setParsed] = useState<ParsedCableSearch | null>(null);
  const [summary, setSummary] = useState<CablePriceSummary | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [filters, setFilters] = useState<CableFilters>(initialFilters);
  const [filterOptions, setFilterOptions] = useState<FilterOptions>({
    cable_standards: [],
    awgs: [],
    color_types: [
      {
        value: "single",
        label: "Single Color",
      },
      {
        value: "dual",
        label: "Dual Color",
      },
    ],
  });

  // =========================================
  // SUMMARY
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

  // =========================================
  // FILTER OPTIONS
  // =========================================

  const fetchFilterOptions = useCallback(async () => {
    try {
      const { data } = await api.get("/api/cable-prices/filter-options");

      if (data?.data) {
        setFilterOptions(data.data);
      }
    } catch {
      toast.error("Failed to load cable filters.");
    }
  }, []);

  // =========================================
  // LOAD ITEMS
  // =========================================

  const loadItems = useCallback(
    async ({
      query = search,
      selectedFilters = filters,
      showLoading = true,
    }: {
      query?: string;

      selectedFilters?: CableFilters;

      showLoading?: boolean;
    } = {}) => {
      if (showLoading) {
        setSearching(true);
      }

      try {
        const { data } = await api.get("/api/cable-prices/search", {
          params: {
            q: query.trim() || undefined,
            awg: selectedFilters.awg || undefined,
            cable_standard: selectedFilters.cable_standard || undefined,
            color_type: selectedFilters.color_type || undefined,
          },
        });

        setResults(data?.data || []);

        setParsed(data?.parsed || null);
      } catch (error: any) {
        toast.error(
          error?.response?.data?.message || "Failed to load cable prices.",
        );
      } finally {
        if (showLoading) {
          setSearching(false);
        }
      }
    },
    [filters, search],
  );

  // =========================================
  // INITIAL LOAD
  // =========================================

  useEffect(() => {
    void fetchSummary();

    void fetchFilterOptions();

    void loadItems({
      query: "",
      selectedFilters: initialFilters,
    });
  }, []);

  // =========================================
  // SEARCH
  // =========================================

  const handleSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void loadItems();
  };

  // =========================================
  // FILTER CHANGE
  // =========================================

  const updateFilter = (key: keyof CableFilters, value: string) => {
    const nextFilters = {
      ...filters,

      [key]: value,
    };

    setFilters(nextFilters);

    void loadItems({
      selectedFilters: nextFilters,
    });
  };

  // =========================================
  // CLEAR
  // =========================================

  const clearAll = () => {
    setSearch("");
    setFilters(initialFilters);
    setParsed(null);

    void loadItems({
      query: "",
      selectedFilters: initialFilters,
    });
  };

  const hasFilters = Boolean(
    search.trim() ||
    filters.awg ||
    filters.cable_standard ||
    filters.color_type,
  );

  // =========================================
  // AFTER EXCEL UPDATE
  // =========================================

  const handleUploadSuccess = useCallback(async () => {
    await Promise.all([fetchSummary(), fetchFilterOptions()]);

    await loadItems({
      showLoading: false,
    });
  }, [fetchFilterOptions, fetchSummary, loadItems]);

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
            Search and filter the current 3F cable price list.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {summaryLoading ? (
            <Badge variant="secondary" className="gap-1.5">
              <Loader2 className="size-3 animate-spin" />
              Loading
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
          SEARCH
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
              placeholder="Search e.g. AHW18UL1007BK-3F"
              className="pl-9"
            />
          </div>

          <Button type="submit" disabled={searching}>
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

        {/* SEARCH PARSER */}
        {parsed && (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="text-xs text-muted-foreground">
              Search detected:
            </span>

            <Badge variant="secondary">Vendor: {parsed.vendor_code}</Badge>

            {parsed.awg !== null && (
              <Badge variant="secondary">AWG: {parsed.awg}</Badge>
            )}

            {parsed.cable_standard && (
              <Badge variant="secondary">{parsed.cable_standard}</Badge>
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
          FILTER SECTION
      ====================================== */}

      <div className="rounded-xl border bg-card p-4 shadow-sm">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Filter className="size-4 text-primary" />

            <div>
              <h2 className="text-sm font-semibold">Filters</h2>

              <p className="text-xs text-muted-foreground">
                Narrow the current cable price list.
              </p>
            </div>
          </div>

          {hasFilters && (
            <Button type="button" variant="ghost" size="sm" onClick={clearAll}>
              <RotateCcw className="size-3.5" />
              Clear
            </Button>
          )}
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          {/* AWG */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">
              Number Before UL / AWG
            </label>

            <select
              value={filters.awg}
              onChange={(event) => updateFilter("awg", event.target.value)}
              className="h-10 w-full rounded-md border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-primary/20"
            >
              <option value="">All AWG</option>

              {filterOptions.awgs.map((awg) => (
                <option key={awg} value={awg}>
                  {awg} AWG
                </option>
              ))}
            </select>
          </div>

          {/* UL */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">
              UL Standard
            </label>

            <select
              value={filters.cable_standard}
              onChange={(event) =>
                updateFilter("cable_standard", event.target.value)
              }
              className="h-10 w-full rounded-md border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-primary/20"
            >
              <option value="">All UL Standards</option>

              {filterOptions.cable_standards.map((standard) => (
                <option key={standard} value={standard}>
                  {standard}
                </option>
              ))}
            </select>
          </div>

          {/* COLOR TYPE */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">
              Color Type
            </label>

            <select
              value={filters.color_type}
              onChange={(event) =>
                updateFilter("color_type", event.target.value)
              }
              className="h-10 w-full rounded-md border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-primary/20"
            >
              <option value="">All Color Types</option>

              {filterOptions.color_types.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* =====================================
          RESULTS
      ====================================== */}

      <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
        <div className="flex items-center justify-between gap-3 border-b px-4 py-3">
          <div>
            <h2 className="font-semibold">Cable Price List</h2>

            <p className="mt-0.5 text-xs text-muted-foreground">
              {hasFilters
                ? "Showing matching cable items."
                : "Showing all current cable items."}
            </p>
          </div>

          <Badge variant="secondary">
            {results.length} {results.length === 1 ? "Item" : "Items"}
          </Badge>
        </div>

        {searching && results.length === 0 ? (
          <div className="flex min-h-48 items-center justify-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            Loading cable prices...
          </div>
        ) : results.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse text-sm">
              <thead className="bg-muted/50 text-xs">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">UL</th>
                  <th className="px-4 py-3 text-left font-medium">
                    Description
                  </th>
                  <th className="px-4 py-3 text-left font-medium">Color</th>
                  <th className="px-4 py-3 text-right font-medium">Price</th>
                  <th className="px-4 py-3 text-left font-medium">
                    Price Range
                  </th>
                  <th className="px-4 py-3 text-left font-medium">
                    Packing / Roll
                  </th>
                  <th className="px-4 py-3 text-left font-medium">MOQ</th>
                  {/* <th className="px-4 py-3 text-left font-medium">Source</th> */}
                </tr>
              </thead>

              <tbody>
                {results.map((row) => (
                  <tr key={row.id} className="border-t hover:bg-muted/30">
                    <td className="whitespace-nowrap px-4 py-3 align-top">
                      <Badge variant="secondary">{row.cable_standard}</Badge>
                    </td>

                    <td className="min-w-72 max-w-lg px-4 py-3 align-top">
                      <p className="font-medium">{row.description}</p>

                      {row.section_name &&
                        row.section_name !== row.cable_standard && (
                          <p className="mt-1 text-xs text-muted-foreground">
                            {row.section_name}
                          </p>
                        )}
                    </td>

                    <td className="whitespace-nowrap px-4 py-3 align-top">
                      {row.color_name || "-"}
                    </td>

                    <td className="whitespace-nowrap px-4 py-3 text-right align-top">
                      <span className="font-semibold">
                        {formatPrice(row.unit_price)}
                      </span>

                      <span className="ml-1 text-xs text-muted-foreground">
                        {row.currency}
                      </span>
                    </td>

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

                    {/* <td className="px-4 py-3 align-top">
                      <div className="flex min-w-40 items-start gap-2">
                        <FileSpreadsheet className="mt-0.5 size-4 shrink-0 text-emerald-600" />

                        <div>
                          <p className="max-w-44 truncate text-xs font-medium">
                            {row.sheet_name}
                          </p>

                          {row.source_row && (
                            <p className="mt-0.5 text-xs text-muted-foreground">
                              Row {row.source_row}
                            </p>
                          )}
                        </div>
                      </div>
                    </td> */}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="flex min-h-48 flex-col items-center justify-center px-4 py-10 text-center">
            <Search className="size-8 text-muted-foreground/50" />
            <p className="mt-3 text-sm font-medium">No cable items found</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Try changing your search or filters.
            </p>
          </div>
        )}
      </div>
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
