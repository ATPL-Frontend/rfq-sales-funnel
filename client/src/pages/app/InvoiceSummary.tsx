import InvoiceSummaryFilter from "@/components/filter/InvoiceSummaryFilter";
import InvoiceMonthlyChart from "@/components/InvoiceMonthlyChart";
import InvoiceSummaryPrint from "@/components/InvoiceSummaryPrint";
import { Modal } from "@/components/modal/Modal";
import SalespersonChart from "@/components/SalespersonInvoiceChart";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import api from "@/lib/api";
import { dateHelper } from "@/lib/dateHelper";
import type { InvoiceItem, salespersonSummary } from "@/types/index.ts";
import { endOfMonth, format, startOfMonth } from "date-fns";
import { ChevronLeft, ChevronRight, Printer } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "react-hot-toast";
import { useReactToPrint } from "react-to-print";

const now = new Date();
const defaultFrom = format(startOfMonth(now), "yyyy-MM-dd");
const defaultTo = format(endOfMonth(now), "yyyy-MM-dd");

type DateRange = { from: string; to: string };

function formatYMD(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function monthLabel(d: Date) {
  // "Dec 2026"
  return d.toLocaleString(undefined, { month: "short", year: "numeric" });
}

type CustomerSummary = {
  customer_name: string;
  customer_email: string | string[];
  no_of_invoices: number;
  salesperson_name: string;
  salesperson_short_form: string | null;
  total_amount_aud: number;
  total_amount_usd: number;
  invoices: InvoiceItem[];
};

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

export default function InvoiceSummaryPage() {
  const printRef = useRef(null);
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
  // const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState<CustomerSummary[]>([]);
  const [range, setRange] = useState<{ from: string; to: string } | null>(null);
  const [summaryData, setSummaryData] = useState<Summary | null>(null);
  const [salespersonSummaryData, setSalespersonSummaryData] = useState<
    salespersonSummary[]
  >([]);
  const [salespersons, setSalespersons] = useState<
    { id: number; name: string }[]
  >([]);
  const [chartdata, setChartdata] = useState<any[]>([]);
  const [salespersonData, setSalespersonData] = useState<any[]>([]);

  const [endMonthCursor, setEndMonthCursor] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1); // normalize to month start
  });

  const window = useMemo(
    () => build3MonthWindow(endMonthCursor),
    [endMonthCursor],
  );

  useEffect(() => {
    (async () => {
      try {
        // setLoading(true);
        const res = await api.get(
          `/api/invoices/monthly-summary?from=${window.range.from}&to=${window.range.to}`,
        );
        setChartdata(res.data.data || []);
        setSalespersonData(res.data.salesperson_summary || []);
      } catch (error) {
        console.error("Error fetching invoice data:", error);
      } finally {
        // setLoading(false);
      }
    })();
  }, [window.range.from, window.range.to]);

  const shiftWindow = (deltaMonths: number) => {
    setEndMonthCursor(
      (prev) => new Date(prev.getFullYear(), prev.getMonth() + deltaMonths, 1),
    );
  };

  // Set defaults on first load
  useEffect(() => {
    const initial: SummaryFilters = {
      date_type: "invoice_date",
      date_from: defaultFrom,
      date_to: defaultTo,
      salesperson_id: "",
    };
    setFilters(initial);
    setAppliedFilters(initial);
  }, [defaultFrom, defaultTo]);

  // Refetch whenever filters are valid
  useEffect(() => {
    if (appliedFilters.date_from && appliedFilters.date_to) {
      fetchSummary(appliedFilters);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appliedFilters]);

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    pageStyle: `
      @page { size: A4; margin: 10mm; }
      @media print { 
        .no-print { display: none !important; }
        .page-break-inside-avoid { page-break-inside: avoid; }
      }
    `,
  });

  async function fetchSummary(f: SummaryFilters) {
    try {
      // setLoading(true);
      const params = new URLSearchParams();

      params.append("date_type", f.date_type);
      if (f.date_from) params.append("from", f.date_from);
      if (f.date_to) params.append("to", f.date_to);
      if (f.salesperson_id) params.append("salesperson_id", f.salesperson_id);

      const { data } = await api.get(
        `/api/invoices/summary?${params.toString()}`,
      );

      setSummary(data.data || []);
      setRange(data.range || null);
      setSummaryData(data.summary || null);
      setSalespersonSummaryData(data.salespersonSummary || []);
    } catch (err: any) {
      toast.error(
        err?.response?.data?.message || "Failed to load invoice summary",
      );
    } finally {
      // setLoading(false);
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

  const formatDate = (d?: string | null) => {
    if (!d) return "N/A";
    const date = new Date(d);
    return isNaN(date.getTime()) ? "N/A" : date.toLocaleDateString();
  };

  useEffect(() => {
    fetchSalesPersons();
  }, []);

  return (
    <div className="space-y-6">
      <div className="print:block absolute -left-[99999px] top-0 w-[1000px] print:static print:w-auto">
        <InvoiceSummaryPrint
          summary={summary}
          chartdata={chartdata}
          salespersonData={salespersonData}
          range={range}
          labels={window.label}
          summaryData={summaryData}
          salespersonSummaryData={salespersonSummaryData}
          ref={printRef}
        />
      </div>

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

          <Button size="sm" variant="secondary" onClick={handlePrint}>
            <Printer className="h-4 w-4" />{" "}
            <span className="sm:block hidden">Print</span>
          </Button>
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

      <div className="space-y-6">
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

      {/* 📊 Summary Tables per Customer */}
      {summary.length === 0 ? (
        <p className="text-center text-gray-500 py-10">
          No invoices found for the selected filters.
        </p>
      ) : (
        summary.map((cust, i) => (
          <Card
            key={i}
            className="shadow-sm border border-gray-300 rounded-xl mb-4 overflow-hidden p-0"
          >
            <CardContent className="p-4">
              {/* Customer summary header */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 mb-4">
                <div className="bg-gray-100 p-4 rounded-lg border border-gray-100">
                  <p className="text-sm font-medium text-gray-500 mb-1">
                    Customer
                  </p>
                  <p className="sm:text-lg font-semibold text-gray-800">
                    {cust.customer_name}
                  </p>
                </div>

                <div className="bg-purple-50 p-4 rounded-lg border border-purple-100">
                  <p className="text-sm font-medium text-gray-500 mb-1">
                    Emails
                  </p>

                  <div className="flex flex-col gap-1">
                    {Array.isArray(cust.customer_email) &&
                    cust.customer_email.length > 0 ? (
                      cust.customer_email.map((email, idx) => (
                        <p
                          key={idx}
                          className="text-sm font-semibold text-purple-700 break-all"
                        >
                          {email}
                        </p>
                      ))
                    ) : (
                      <p className="text-sm text-gray-500">No email</p>
                    )}
                  </div>
                </div>

                <div className="bg-gray-200 p-4 rounded-lg border border-gray-100">
                  <p className="text-sm font-medium text-gray-500 mb-1">
                    Total Invoices
                  </p>
                  <p className="sm:text-lg font-semibold text-gray-800">
                    {cust.no_of_invoices}
                  </p>
                </div>

                <div className="bg-red-50 p-4 rounded-lg border border-red-100">
                  <p className="text-sm font-medium text-gray-500 mb-1">
                    Sales Person
                  </p>
                  <p className="sm:text-lg font-bold text-primary">
                    {cust.salesperson_name}
                  </p>
                </div>

                <div className="bg-green-50 p-4 rounded-lg border border-green-100">
                  <p className="text-sm font-medium text-gray-500 mb-1">
                    Total (AUD)
                  </p>
                  <p className="sm:text-lg font-bold text-green-700">
                    ${cust.total_amount_aud.toFixed(2)}
                  </p>
                </div>

                <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                  <p className="text-sm font-medium text-gray-500 mb-1">
                    Total (USD)
                  </p>
                  <p className="sm:text-lg font-bold text-blue-700">
                    ${cust.total_amount_usd.toFixed(2)}
                  </p>
                </div>
              </div>

              {/* Invoices table */}
              <div className="overflow-x-auto rounded-lg border border-gray-200">
                <Table className="min-w-full divide-y divide-gray-200">
                  <TableHeader className="bg-gray-100">
                    <TableRow>
                      <TableHead className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        S/N
                      </TableHead>
                      <TableHead className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Sent Date
                      </TableHead>
                      <TableHead className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Created Date
                      </TableHead>
                      <TableHead className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Invoice No
                      </TableHead>
                      <TableHead className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Amount
                      </TableHead>
                      <TableHead className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Currency
                      </TableHead>
                      <TableHead className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        GST
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody className="bg-white divide-y divide-gray-200">
                    {cust.invoices.map((inv, idx) => (
                      <TableRow
                        key={idx}
                        className="hover:bg-gray-50 transition-colors"
                      >
                        <TableCell className="py-3 px-4 text-sm text-gray-700">
                          {idx + 1}
                        </TableCell>
                        <TableCell className="py-3 px-4 text-sm text-gray-700">
                          {formatDate(inv.date)}
                        </TableCell>
                        <TableCell className="py-3 px-4 text-sm text-gray-700">
                          {formatDate(inv.create_invoice_date)}
                        </TableCell>
                        <TableCell className="py-3 px-4 text-sm font-medium text-gray-900">
                          {inv.invoice_no}
                        </TableCell>
                        <TableCell className="py-3 px-4 text-sm text-gray-700 font-mono">
                          $ {inv.amount.toFixed(2)}
                        </TableCell>
                        <TableCell className="py-3 px-4">
                          <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-800">
                            {inv.currency}
                          </span>
                        </TableCell>
                        <TableCell className="py-3 px-4">
                          <Badge variant={inv.gst ? "secondary" : "excluded"}>
                            {inv.gst ? "Included" : "Excluded"}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}
