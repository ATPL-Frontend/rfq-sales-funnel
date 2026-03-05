import type { Column } from "@/components/CommonTable";
import CommonTable from "@/components/CommonTable";
import MonthYearPicker from "@/components/filter/MonthYearPicker";
import InvoiceMonthlyChart from "@/components/InvoiceMonthlyChart";
import SalespersonChart from "@/components/SalespersonInvoiceChart";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import api from "../../lib/api";

import InvoiceSummaryFilter from "@/components/filter/InvoiceSummaryFilter";
import { Modal } from "@/components/modal/Modal";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { dateHelper } from "@/lib/dateHelper";
import type { salespersonSummary } from "@/types/index.ts";
import { endOfMonth, format, startOfMonth } from "date-fns";
// import { useReactToPrint } from "react-to-print";

interface MonthlyData {
  year_month: string;
  month: string;
  invoice_count: number;
  amount_sum: number;
  currency: string;
}

interface CustomerApiData {
  customer_id: number;
  customer_name: string;
  salesperson_id: number;
  salesperson_name: string;
  salesperson_short_form: string | null;
  currency: string;
  total_invoices: number;
  total_amount: number;
  monthly_data: MonthlyData[];
}

interface FrequencyRow {
  customer_id: number;
  customer_name: string;
  salesperson_short_form?: string | null;
  currency?: string;

  // dynamic keys like "2026-01_count", "2026-01_amount", ...
  [key: string]: any;
}

type Summary = {
  total_invoices: number;
  total_customers: number;
  total_amount_aud: number;
  total_amount_usd: number;
};

type SummaryFilters = {
  date_type: "invoice_date" | "create_invoice_date";
  date_from: string;
  date_to: string;
  salesperson_id: string;
};

type DateRange = { from: string; to: string };

const now = new Date();
const defaultFrom = format(startOfMonth(now), "yyyy-MM-dd");
const defaultTo = format(endOfMonth(now), "yyyy-MM-dd");

function formatYMD(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function build3MonthWindow(endMonthCursor: Date) {
  const y = endMonthCursor.getFullYear();
  const m = endMonthCursor.getMonth();

  const start = new Date(y, m - 2, 1); // first day of (end-2) month
  const end = new Date(y, m + 1, 0); // last day of end month

  return {
    start,
    end,
    range: { from: formatYMD(start), to: formatYMD(end) } as DateRange,
    label: `${monthLabel(start)} - ${monthLabel(end)}`,
  };
}

function monthLabel(d: Date) {
  // "Dec 2026"
  return d.toLocaleString(undefined, { month: "short", year: "numeric" });
}

const InvoiceFrequency = () => {
  const [rawData, setRawData] = useState<CustomerApiData[]>([]);
  const [loading, setLoading] = useState(false);

  const currentYear = new Date().getFullYear();
  const [fromMonth, setFromMonth] = useState(`${currentYear}-01`);
  const [toMonth, setToMonth] = useState(`${currentYear}-12`);

  const [salespersonData, setSalespersonData] = useState<any[]>([]);
  const [chartdata, setChartdata] = useState<any[]>([]);
  const [endMonthCursor, setEndMonthCursor] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1); // normalize to month start
  });

  const [filters, setFilters] = useState<SummaryFilters>({
    date_type: "invoice_date", // default = Sent Date
    date_from: "",
    date_to: "",
    salesperson_id: "",
  });
  const [appliedFilters, setAppliedFilters] = useState<SummaryFilters>({
    date_type: "invoice_date",
    date_from: "",
    date_to: "",
    salesperson_id: "",
  });
  const [range, setRange] = useState<{ from: string; to: string } | null>(null);
  const [summaryData, setSummaryData] = useState<Summary | null>(null);
  const [salespersonSummaryData, setSalespersonSummaryData] = useState<
    salespersonSummary[]
  >([]);
  const [salespersons, setSalespersons] = useState<
    { id: number; name: string }[]
  >([]);

  const window = useMemo(
    () => build3MonthWindow(endMonthCursor),
    [endMonthCursor],
  );

  const fetchData = async () => {
    if (!fromMonth || !toMonth) {
      toast.error("Please select both From and To month");
      return;
    }

    if (fromMonth > toMonth) {
      toast.error("From month cannot be greater than To month");
      return;
    }

    try {
      setLoading(true);

      const from = `${fromMonth}-01`;

      const toDate = new Date(
        Number(toMonth.split("-")[0]),
        Number(toMonth.split("-")[1]),
        0,
      )
        .toISOString()
        .split("T")[0];

      const res = await api.get(
        `/api/invoices/frequency?from=${from}&to=${toDate}`,
      );

      setRawData(res.data.data || []);
    } catch (err) {
      console.error("Frequency fetch error:", err);
      toast.error("Failed to fetch data");
    } finally {
      setLoading(false);
    }
  };

  const shiftWindow = (deltaMonths: number) => {
    setEndMonthCursor(
      (prev) => new Date(prev.getFullYear(), prev.getMonth() + deltaMonths, 1),
    );
  };

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const res = await api.get(
          `/api/invoices/monthly-summary?from=${window.range.from}&to=${window.range.to}`,
        );
        setChartdata(res.data.data || []);
        setSalespersonData(res.data.salesperson_summary || []);
      } catch (error) {
        console.error("Error fetching invoice data:", error);
      } finally {
        setLoading(false);
      }
    })();
  }, [window.range.from, window.range.to]);

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const res = await api.get(
          `/api/invoices/monthly-summary?from=${window.range.from}&to=${window.range.to}`,
        );
        setChartdata(res.data.data || []);
        setSalespersonData(res.data.salesperson_summary || []);
      } catch (error) {
        console.error("Error fetching invoice data:", error);
      } finally {
        setLoading(false);
      }
    })();
  }, [window.range.from, window.range.to]);

  // 🔹 Extract unique months from API data
  const months = useMemo(() => {
    const map = new Map<string, string>();

    rawData.forEach((c) => {
      c.monthly_data.forEach((m) => {
        map.set(m.year_month, m.month);
      });
    });

    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, label]) => ({ key, label }));
  }, [rawData]);

  // 🔹 Flatten rows into primitives only (no objects), so CommonTable won't crash
  const tableData: FrequencyRow[] = useMemo(() => {
    return rawData.map((customer) => {
      const row: FrequencyRow = {
        customer_id: customer.customer_id,
        customer_name: customer.customer_name,
        salesperson_short_form: customer.salesperson_short_form ?? null,
        currency: customer.currency ?? "",
      };

      months.forEach((m) => {
        const found = customer.monthly_data.find((x) => x.year_month === m.key);

        row[`${m.key}_count`] = found ? found.invoice_count : 0;
        row[`${m.key}_amount`] = found ? found.amount_sum : 0;
        row[`${m.key}_currency`] = found ? found.currency : customer.currency;
      });

      return row;
    });
  }, [rawData, months]);

  const columns: Column<FrequencyRow>[] = useMemo(() => {
    const baseColumn: Column<FrequencyRow> = {
      key: "customer_name",
      label: "Customer",
      render: (row) => (
        <div className="flex items-center gap-2">
          <span className="font-medium text-primary">{row.customer_name}</span>
          {row.salesperson_short_form ? (
            <span className="text-muted-foreground text-sm">
              ({row.salesperson_short_form})
            </span>
          ) : null}
        </div>
      ),
    };

    // Each month column uses the *_count key (primitive), and renders amount beside it
    const monthColumns: Column<FrequencyRow>[] = months.map((m) => ({
      key: `${m.key}_count`,
      label: <div>{m.label}</div>,
      render: (row) => {
        const count = row[`${m.key}_count`] ?? 0;
        const amount = row[`${m.key}_amount`] ?? 0;
        const currency = row[`${m.key}_currency`] ?? row.currency ?? "";

        return (
          <div className="font-medium">
            {count}
            <span
              className={`ml-2 text-xs ${currency === "USD" ? "text-violet-600" : "text-primary"}`}
            >
              ({Number(amount).toFixed(2)} {currency})
            </span>
          </div>
        );
      },
    }));

    return [baseColumn, ...monthColumns];
  }, [months]);

  useEffect(() => {
    const initial: SummaryFilters = {
      date_type: "invoice_date",
      date_from: defaultFrom,
      date_to: defaultTo,
      salesperson_id: "",
    };

    setFilters(initial);
    setAppliedFilters(initial); // ✅ important
  }, []);

  // Refetch whenever filters are valid
  useEffect(() => {
    if (appliedFilters.date_from && appliedFilters.date_to) {
      fetchSummary(appliedFilters);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appliedFilters]);

  async function fetchSummary(f: SummaryFilters) {
    try {
      setLoading(true);
      const params = new URLSearchParams();

      params.append("date_type", f.date_type);
      if (f.date_from) params.append("from", f.date_from);
      if (f.date_to) params.append("to", f.date_to);
      if (f.salesperson_id) params.append("salesperson_id", f.salesperson_id);

      const { data } = await api.get(
        `/api/invoices/summary?${params.toString()}`,
      );

      setRange(data.range || null);
      setSummaryData(data.summary || null);
      setSalespersonSummaryData(data.salespersonSummary || []);
    } catch (err: any) {
      toast.error(
        err?.response?.data?.message || "Failed to load invoice summary",
      );
    } finally {
      setLoading(false);
    }
  }

  const fetchSalesPersons = async () => {
    if (salespersons.length > 0) return;
    try {
      const { data } = await api.get("/api/users?limit=200&role=sales-person");
      const allUsers = data.data || [];
      setSalespersons(allUsers);
    } catch (err) {
      toast.error("Failed to load salespersons");
    }
  };

  useEffect(() => {
    fetchSalesPersons();
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex justify-between">
        <h1 className="text-2xl font-semibold text-gray-800">
          Invoice Summary
        </h1>

        {/* 🔍 Filters */}
        <div className="flex gap-2">
          <Modal icon="filter" label="Filters" title="Invoice Filters">
            {(closeModal: () => void) => (
              <InvoiceSummaryFilter
                filters={filters}
                setFilters={setFilters}
                setAppliedFilters={setAppliedFilters}
                salespersons={salespersons}
                defaultFrom={defaultFrom}
                defaultTo={defaultTo}
                closeModal={closeModal}
              />
            )}
          </Modal>

          {/* <Button size="sm" variant="secondary" onClick={handlePrint}>
            <Printer className="h-4 w-4" />{" "}
            <span className="sm:block hidden">Print</span>
          </Button> */}
        </div>
      </div>

      <div>
        <h2 className="sm:text-xl font-semibold text-gray-700">
          Invoices sent from {dateHelper(range?.from ?? "")} to{" "}
          {dateHelper(range?.to ?? "")}
        </h2>
      </div>

      <div className="overflow-x-auto rounded-lg border border-gray-200">
        <Table className="min-w-full">
          <TableHeader className="bg-primary">
            <TableRow className="hover:bg-primary">
              <TableHead className="py-3 px-4 text-xs text-center font-medium text-white uppercase tracking-wider">
                Total Invoices
              </TableHead>
              <TableHead className="py-3 px-4 text-xs text-center font-medium text-white uppercase tracking-wider">
                Total Customers
              </TableHead>
              <TableHead className="py-3 px-4 text-xs text-center font-medium text-white uppercase tracking-wider">
                Total Amount (AUD)
              </TableHead>
              <TableHead className="py-3 px-4 text-xs text-center font-medium text-white uppercase tracking-wider">
                Total Amount (USD)
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="bg-secondary">
            <TableRow className="text-center">
              <TableCell className="py-3 px-4 text-sm text-gray-700">
                {summaryData?.total_invoices || 0}
              </TableCell>
              <TableCell className="py-3 px-4 text-sm text-gray-700">
                {summaryData?.total_customers || 0}
              </TableCell>
              <TableCell className="py-3 px-4 text-sm font-medium text-gray-900">
                $ {summaryData?.total_amount_aud.toFixed(2) || 0}
              </TableCell>
              <TableCell className="py-3 px-4 text-sm font-medium text-gray-900">
                $ {summaryData?.total_amount_usd.toFixed(2) || 0}
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>

      <div className="overflow-x-auto rounded-lg border border-gray-200">
        <Table className="min-w-full">
          <TableHeader className="bg-primary">
            <TableRow className="hover:bg-primary">
              <TableHead className="py-3 px-4 text-xs font-medium text-white uppercase tracking-wider">
                Sales Person
              </TableHead>
              <TableHead className="py-3 px-4 text-xs font-medium text-white uppercase tracking-wider">
                Total Customers
              </TableHead>
              <TableHead className="py-3 px-4 text-xs font-medium text-white uppercase tracking-wider">
                Total Invoices
              </TableHead>
              <TableHead className="py-3 px-4 text-xs font-medium text-white uppercase tracking-wider">
                Total Amount (AUD)
              </TableHead>
              <TableHead className="py-3 px-4 text-xs font-medium text-white uppercase tracking-wider">
                Total Amount (USD)
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="bg-secondary">
            {salespersonSummaryData.length > 0 ? (
              salespersonSummaryData.map((sp) => (
                <TableRow key={sp.salesperson_id}>
                  <TableCell className="py-3 px-4 text-sm text-gray-700">
                    {sp.salesperson_name || ""}
                  </TableCell>
                  <TableCell className="py-3 px-4 text-sm text-gray-700">
                    {sp.total_customers || 0}
                  </TableCell>
                  <TableCell className="py-3 px-4 text-sm text-gray-700">
                    {sp.total_invoices || 0}
                  </TableCell>
                  <TableCell className="py-3 px-4 text-sm font-medium text-gray-900">
                    $ {sp.total_aud.toFixed(2) || 0}
                  </TableCell>
                  <TableCell className="py-3 px-4 text-sm font-medium text-gray-900">
                    $ {sp.total_usd.toFixed(2) || 0}
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  className="py-3 px-4 text-sm text-gray-700 text-center"
                  colSpan={5}
                >
                  No salesperson found for the selected filters.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="space-y-6 mt-8">
        {/* Invoice Section */}
        <div>
          <h1 className="text-2xl font-bold mb-2">Invoice Overview</h1>

          <div className="flex items-center gap-2 select-none mb-2 mx-auto w-max">
            <Button
              variant="outline"
              onClick={() => shiftWindow(-1)}
              aria-label="Previous 3-month range"
            >
              <ChevronLeft />
            </Button>

            <div className="px-3 py-1 rounded font-medium">{window.label}</div>

            <Button
              variant="outline"
              onClick={() => shiftWindow(1)}
              aria-label="Next 3-month range"
            >
              <ChevronRight />
            </Button>
          </div>
          <InvoiceMonthlyChart data={chartdata} />
        </div>

        {/* Salesperson Section */}
        <div>
          <div className="mb-6">
            <h2 className="text-2xl font-bold">Salesperson Performance</h2>
            <p className="text-gray-600">Performance metrics by salesperson</p>
          </div>

          {salespersonData.length > 0 ? (
            <SalespersonChart data={salespersonData} monthsToShow={3} />
          ) : (
            <div className="text-center py-12 text-gray-500 border rounded-lg">
              <p className="text-lg mb-2">No salesperson data available</p>
              <p className="text-sm">
                Data will appear when salespeople create invoices
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Header Row */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mt-14">
        <h1 className="text-xl font-semibold">Invoice Frequency</h1>

        <div className="flex items-center sm:gap-3 gap-2 flex-wrap">
          <MonthYearPicker
            value={fromMonth}
            onChange={setFromMonth}
            placeholder="From Month"
          />

          <span className="text-muted-foreground">to</span>

          <MonthYearPicker
            value={toMonth}
            onChange={setToMonth}
            placeholder="To Month"
          />

          <Button size="sm" onClick={fetchData} disabled={loading}>
            Apply
          </Button>
        </div>
      </div>

      <CommonTable columns={columns} data={tableData} loading={loading} />
    </div>
  );
};

export default InvoiceFrequency;
