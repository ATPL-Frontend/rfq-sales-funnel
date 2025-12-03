import InvoiceSummaryPrint from "@/components/InvoiceSummaryPrint";
import SearchSelectPopover from "@/components/SearchSelectPopover";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
import { Printer } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "react-hot-toast";
import { useReactToPrint } from "react-to-print";

const now = new Date();
const defaultFrom = format(startOfMonth(now), "yyyy-MM-dd");
const defaultTo = format(endOfMonth(now), "yyyy-MM-dd");

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

export default function InvoiceSummaryPage() {
  const printRef = useRef(null);
  const [filters, setFilters] = useState({
    date_from: "",
    date_to: "",
    salesperson_id: "",
  });
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState<CustomerSummary[]>([]);
  const [range, setRange] = useState<{ from: string; to: string } | null>(null);
  const [summaryData, setSummaryData] = useState<Summary | null>(null);
  const [salespersonSummaryData, setSalespersonSummaryData] = useState<
    salespersonSummary[]
  >([]);
  const [salespersons, setSalespersons] = useState<
    { id: number; name: string }[]
  >([]);

  // Set defaults on first load
  useEffect(() => {
    setFilters({
      date_from: defaultFrom,
      date_to: defaultTo,
      salesperson_id: "",
    });
  }, []);

  // Refetch whenever filters are valid
  useEffect(() => {
    if (filters.date_from && filters.date_to) {
      fetchSummary();
    }
  }, [filters]);

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

  async function fetchSummary() {
    try {
      setLoading(true);
      const params = new URLSearchParams();

      if (filters.date_from) params.append("from", filters.date_from);
      if (filters.date_to) params.append("to", filters.date_to);
      if (filters.salesperson_id)
        params.append("salesperson_id", filters.salesperson_id);

      const { data } = await api.get(
        `/api/invoices/summary?${params.toString()}`
      );

      setSummary(data.data || []);
      setRange(data.range || null);
      setSummaryData(data.summary || null);
      setSalespersonSummaryData(data.salespersonSummary || []);
    } catch (err: any) {
      toast.error(
        err?.response?.data?.message || "Failed to load invoice summary"
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
    <div className="space-y-6">
      <div className="hidden">
        <InvoiceSummaryPrint
          summary={summary}
          range={range}
          summaryData={summaryData}
          salespersonSummaryData={salespersonSummaryData}
          ref={printRef}
        />
      </div>

      <h1 className="text-2xl font-semibold text-gray-800">Invoice Summary</h1>

      {/* 🔍 Filters */}
      <div className="p-4 mb-4 border border-primary border-dashed rounded grid grid-cols-1 sm:grid-cols-3 gap-4 no-print">
        {/* From Date */}
        <div>
          <label className="block text-sm text-gray-600 mb-1">From Date</label>
          <Input
            type="date"
            value={filters.date_from}
            onChange={(e) =>
              setFilters({ ...filters, date_from: e.target.value })
            }
            className="w-full"
          />
        </div>

        {/* To Date */}
        <div>
          <label className="block text-sm text-gray-600 mb-1">To Date</label>
          <Input
            type="date"
            value={filters.date_to}
            onChange={(e) =>
              setFilters({ ...filters, date_to: e.target.value })
            }
            className="w-full"
          />
        </div>

        {/* Sales Person */}
        <div>
          <SearchSelectPopover
            label="Sales Person"
            options={salespersons}
            value={filters.salesperson_id}
            onChange={(val) =>
              setFilters({ ...filters, salesperson_id: val.toString() })
            }
            placeholder="Select salesperson"
          />
        </div>

        {/* Buttons Row */}
        <div className="col-span-1 sm:col-span-3">
          <div className="grid grid-cols-3 gap-4">
            <Button
              onClick={fetchSummary}
              disabled={loading}
              className="w-full"
            >
              {loading ? "Loading..." : "Apply Filter"}
            </Button>

            <Button
              variant="outline"
              className="w-full"
              onClick={() => {
                setFilters({
                  date_from: defaultFrom,
                  date_to: defaultTo,
                  salesperson_id: "",
                });
                fetchSummary();
              }}
            >
              Reset
            </Button>
            
            <Button
              variant="secondary"
              onClick={handlePrint}
              className="w-full"
            >
              Print <Printer className="ml-2 h-4 w-4" />
            </Button>
          </div>
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
                        Date
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
                          {new Date(inv.date).toLocaleDateString()}
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
