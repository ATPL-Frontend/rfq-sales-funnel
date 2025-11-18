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
import { endOfMonth, format, startOfMonth } from "date-fns";
import { useEffect, useState } from "react";
import { toast } from "react-hot-toast";

const now = new Date();
const defaultFrom = format(startOfMonth(now), "yyyy-MM-dd");
const defaultTo = format(endOfMonth(now), "yyyy-MM-dd");

type Invoice = {
  date: string;
  invoice_no: string;
  amount: number;
  currency: "AUD" | "USD";
};

type CustomerSummary = {
  customer_name: string;
  no_of_invoices: number;
  total_amount_aud: number;
  total_amount_usd: number;
  invoices: Invoice[];
};

export default function InvoiceSummaryPage() {
  const [filters, setFilters] = useState({
    date_from: "",
    date_to: "",
  });
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState<CustomerSummary[]>([]);

  useEffect(() => {
    if (!filters.date_from || !filters.date_to) {
      setFilters({ date_from: defaultFrom, date_to: defaultTo });
    }
  }, []);

  async function fetchSummary() {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filters.date_from) params.append("from", filters.date_from);
      if (filters.date_to) params.append("to", filters.date_to);

      const { data } = await api.get(
        `/api/invoices/summary?${params.toString()}`
      );
      setSummary(data.data || []);
    } catch (err: any) {
      toast.error(
        err?.response?.data?.message || "Failed to load invoice summary"
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchSummary();
  }, []);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-gray-800">Invoice Summary</h1>

      {/* 🔍 Filters */}
      <div className="p-4 mb-4 border border-primary border-dashed rounded grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        {/* From Date */}
        <div className="col-span-1">
          <label className="block text-sm text-gray-600 mb-1">From Date</label>
          <Input
            type="date"
            value={filters.date_from}
            onChange={(e) =>
              setFilters({ ...filters, date_from: e.target.value })
            }
          />
        </div>

        {/* To Date */}
        <div className="col-span-1">
          <label className="block text-sm text-gray-600 mb-1">To Date</label>
          <Input
            type="date"
            value={filters.date_to}
            onChange={(e) =>
              setFilters({ ...filters, date_to: e.target.value })
            }
          />
        </div>

        {/* Action buttons */}
        <div className="col-span-2 md:col-span-1 flex items-end gap-2">
          <Button onClick={fetchSummary} disabled={loading} className="flex-1">
            {loading ? "Loading..." : "Apply Filter"}
          </Button>
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => {
              setFilters({ date_from: defaultFrom, date_to: defaultTo });
              fetchSummary();
            }}
          >
            Reset
          </Button>
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
            className="shadow-lg border border-gray-200 rounded-xl mb-4 overflow-hidden p-0"
          >
            <CardContent className="p-4">
              {/* Customer summary header */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                  <p className="text-sm font-medium text-gray-500 mb-1">
                    Customer
                  </p>
                  <p className="text-lg font-semibold text-gray-800">
                    {cust.customer_name}
                  </p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                  <p className="text-sm font-medium text-gray-500 mb-1">
                    # of Invoices
                  </p>
                  <p className="text-lg font-semibold text-gray-800">
                    {cust.no_of_invoices}
                  </p>
                </div>
                <div className="bg-green-50 p-4 rounded-lg border border-green-100">
                  <p className="text-sm font-medium text-gray-500 mb-1">
                    Total (AUD)
                  </p>
                  <p className="text-lg font-bold text-green-700">
                    ${cust.total_amount_aud.toFixed(2)}
                  </p>
                </div>
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                  <p className="text-sm font-medium text-gray-500 mb-1">
                    Total (USD)
                  </p>
                  <p className="text-lg font-bold text-blue-700">
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
                          {inv.amount.toFixed(2)}
                        </TableCell>
                        <TableCell className="py-3 px-4">
                          <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-800">
                            {inv.currency}
                          </span>
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
