import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { dateHelper } from "@/lib/dateHelper";
import type { InvoiceItem, salespersonSummary } from "@/types/index.ts";
import { forwardRef } from "react";
// import InvoiceMonthlyChart from "./InvoiceMonthlyChart";
// import SalespersonChart from "./SalespersonInvoiceChart";

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

interface InvoiceSummaryPrintProps {
  summary: CustomerSummary[];
  range: { from: string; to: string } | null;
  summaryData: Summary | null;
  salespersonSummaryData: salespersonSummary[];
  chartdata: any[];
  salespersonData: any[];
  labels: string;
}

const InvoiceSummaryPrint = forwardRef<
  HTMLDivElement,
  InvoiceSummaryPrintProps
>(
  (
    {
      summary,
      range,
      // chartdata,
      // salespersonData,
      summaryData,
      salespersonSummaryData,
      // labels,
    },
    ref
  ) => {
    return (
      <div ref={ref} className="p-4 bg-white">
        {/* <h1 className="text-2xl font-bold text-center mb-6">
          Invoice Summary Report
        </h1>

        <div className="space-y-8">
          <div>
            <h1 className="text-2xl font-bold mb-2">Invoice Overview</h1>
            <p className="text-gray-600 mb-6">
              Monthly performance metrics for invoices sent - <span className="font-medium">{labels}</span>
            </p>
            <InvoiceMonthlyChart data={chartdata} />
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
        </div> */}

        <div className="print:break-before-page print:page-break-before-always">
          <div className="mb-4 text-center">
            <h2 className="text-lg font-semibold">
              Invoices sent from {dateHelper(range?.from ?? "")} to{" "}
              {dateHelper(range?.to ?? "")}
            </h2>
          </div>

          {/* Overall Summary Table */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-3">Overall Summary</h3>
            <Table className="w-full border-collapse border border-gray-300">
              <TableHeader className="bg-gray-100">
                <TableRow>
                  <TableHead className="border border-gray-300 p-2 text-center font-medium">
                    Total Invoices
                  </TableHead>
                  <TableHead className="border border-gray-300 p-2 text-center font-medium">
                    Total Customers
                  </TableHead>
                  <TableHead className="border border-gray-300 p-2 text-center font-medium">
                    Total Amount (AUD)
                  </TableHead>
                  <TableHead className="border border-gray-300 p-2 text-center font-medium">
                    Total Amount (USD)
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell className="border border-gray-300 p-2 text-center">
                    {summaryData?.total_invoices || 0}
                  </TableCell>
                  <TableCell className="border border-gray-300 p-2 text-center">
                    {summaryData?.total_customers || 0}
                  </TableCell>
                  <TableCell className="border border-gray-300 p-2 text-center font-medium">
                    $ {summaryData?.total_amount_aud.toFixed(2) || 0}
                  </TableCell>
                  <TableCell className="border border-gray-300 p-2 text-center font-medium">
                    $ {summaryData?.total_amount_usd.toFixed(2) || 0}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>

          {/* Salesperson Summary Table */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-3">Salesperson Summary</h3>
            <Table className="w-full border-collapse border border-gray-300">
              <TableHeader className="bg-gray-100">
                <TableRow>
                  <TableHead className="border border-gray-300 p-2 font-medium">
                    Sales Person
                  </TableHead>
                  <TableHead className="border border-gray-300 p-2 text-center font-medium">
                    Total Customers
                  </TableHead>
                  <TableHead className="border border-gray-300 p-2 text-center font-medium">
                    Total Invoices
                  </TableHead>
                  <TableHead className="border border-gray-300 p-2 text-center font-medium">
                    Total Amount (AUD)
                  </TableHead>
                  <TableHead className="border border-gray-300 p-2 text-center font-medium">
                    Total Amount (USD)
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {salespersonSummaryData.length > 0 ? (
                  salespersonSummaryData.map((sp) => (
                    <TableRow key={sp.salesperson_id}>
                      <TableCell className="border border-gray-300 p-2">
                        {sp.salesperson_name || ""}
                      </TableCell>
                      <TableCell className="border border-gray-300 p-2 text-center">
                        {sp.total_customers || 0}
                      </TableCell>
                      <TableCell className="border border-gray-300 p-2 text-center">
                        {sp.total_invoices || 0}
                      </TableCell>
                      <TableCell className="border border-gray-300 p-2 text-center font-medium">
                        $ {sp.total_aud.toFixed(2) || 0}
                      </TableCell>
                      <TableCell className="border border-gray-300 p-2 text-center font-medium">
                        $ {sp.total_usd.toFixed(2) || 0}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell
                      className="border border-gray-300 p-2 text-center"
                      colSpan={5}
                    >
                      No salesperson found for the selected filters.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* Customer Summary */}
        {summary.length === 0 ? (
          <p className="text-center text-gray-500 py-4">
            No invoices found for the selected filters.
          </p>
        ) : (
          <div>
            <h3 className="text-lg font-semibold my-3">Customer Details</h3>
            {summary.map((cust, i) => (
              <div key={i} className="mb-6 page-break-inside-avoid">
                {/* Customer Header - Compact */}
                <div className="mb-3 p-3 bg-gray-50 border border-gray-200 rounded">
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="col-span-2">
                      <span className="font-medium">Customer:</span>{" "}
                      {cust.customer_name}
                    </div>
                    <div>
                      <span className="font-medium">Sales Person:</span>{" "}
                      {cust.salesperson_name}
                    </div>
                    <div>
                      <span className="font-medium">Total (AUD):</span> $
                      {cust.total_amount_aud.toFixed(2)}
                    </div>
                    <div>
                      <span className="font-medium">Total Invoices:</span>{" "}
                      {cust.no_of_invoices}
                    </div>
                    <div>
                      <span className="font-medium">Total (USD):</span> $
                      {cust.total_amount_usd.toFixed(2)}
                    </div>
                    <div className="col-span-2">
                      <span className="font-medium">Emails:</span>{" "}
                      {Array.isArray(cust.customer_email) &&
                      cust.customer_email.length > 0
                        ? cust.customer_email.join(", ")
                        : "No email"}
                    </div>
                  </div>
                </div>

                {/* Invoices Table - Compact */}
                <Table className="w-full border-collapse border border-gray-300 text-sm">
                  <TableHeader className="bg-gray-100">
                    <TableRow>
                      <TableHead className="border border-gray-300 p-1 text-xs font-medium text-center">
                        S/N
                      </TableHead>
                      <TableHead className="border border-gray-300 p-1 text-xs font-medium text-center">
                        Date
                      </TableHead>
                      <TableHead className="border border-gray-300 p-1 text-xs font-medium text-center">
                        Invoice No
                      </TableHead>
                      <TableHead className="border border-gray-300 p-1 text-xs font-medium text-center">
                        Amount
                      </TableHead>
                      <TableHead className="border border-gray-300 p-1 text-xs font-medium text-center">
                        Currency
                      </TableHead>
                      <TableHead className="border border-gray-300 p-1 text-xs font-medium text-center">
                        GST
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {cust.invoices.map((inv, idx) => (
                      <TableRow key={idx}>
                        <TableCell className="border border-gray-300 p-1 text-center">
                          {idx + 1}
                        </TableCell>
                        <TableCell className="border border-gray-300 p-1">
                          {new Date(inv.date).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="border border-gray-300 p-1">
                          {inv.invoice_no}
                        </TableCell>
                        <TableCell className="border border-gray-300 p-1 text-right">
                          $ {inv.amount.toFixed(2)}
                        </TableCell>
                        <TableCell className="border border-gray-300 p-1 text-center">
                          {inv.currency}
                        </TableCell>
                        <TableCell className="border border-gray-300 p-1 text-center">
                          <Badge
                            variant={inv.gst ? "secondary" : "excluded"}
                            className="text-xs"
                          >
                            {inv.gst ? "Included" : "Excluded"}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }
);

InvoiceSummaryPrint.displayName = "InvoiceSummaryPrint";

export default InvoiceSummaryPrint;
