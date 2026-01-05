import { Badge } from "@/components/ui/badge";
import type { Invoice } from "@/types/index.ts";
import { Mail } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "../../components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";
import api from "../../lib/api";
import { dateHelper, OFFER_EXPIRED_DATE_FORMAT } from "../../lib/dateHelper";

export default function InvoiceDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchInvoice = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const { data } = await api.get(`/api/invoices/${id}`);
      const invoiceData: Invoice = data.data || data;
      setInvoice(invoiceData || null);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load invoice details");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchInvoice();
  }, [fetchInvoice]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading invoice details...</p>
        </div>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <p className="text-gray-500">Invoice not found or no data available.</p>
        <Button variant="outline" onClick={() => navigate(-1)}>
          Go Back
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-6">
      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        {/* Page Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Invoice Details</h1>
            <p className="text-sm text-gray-500 mt-1">
              Invoice #{invoice.invoice_no} •{" "}
              {dateHelper(invoice.invoice_date, OFFER_EXPIRED_DATE_FORMAT)}
            </p>
          </div>
          <Button variant="outline" onClick={() => navigate(-1)}>
            Back
          </Button>
        </div>

        {/* Main Content */}
        <div className="space-y-4">
          {/* Invoice Overview */}
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg">Invoice Information</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div>
                    <p className="text-xs text-gray-500 uppercase">
                      Invoice Number
                    </p>
                    <p className="font-medium">{invoice.invoice_no}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase">
                      Invoice Date
                    </p>
                    <p className="font-medium">
                      {dateHelper(
                        invoice.invoice_date,
                        OFFER_EXPIRED_DATE_FORMAT
                      )}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase">
                      Created Invoice Date
                    </p>
                    <p className="font-medium">
                      {dateHelper(
                        invoice.create_invoice_date,
                        OFFER_EXPIRED_DATE_FORMAT
                      ) || "N/A"}
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  <div>
                    <p className="text-xs text-gray-500 uppercase">Amount</p>
                    <div className="flex items-center gap-2">
                      <p className="text-lg font-bold">
                        {Number(invoice.amount).toLocaleString()}{" "}
                        {invoice.currency}
                      </p>
                      <Badge
                        variant={invoice.gst ? "default" : "secondary"}
                        className="text-xs"
                      >
                        {invoice.gst ? "GST Included" : "GST Excluded"}
                      </Badge>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase">Currency</p>
                    <p className="font-medium">{invoice.currency}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Customer Information */}
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg">Customer Information</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div>
                    <p className="text-xs text-gray-500 uppercase">
                      Customer Name
                    </p>
                    <p className="font-medium">
                      {invoice.customer_name || "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase">
                      Customer Code
                    </p>
                    <p className="font-medium">
                      {invoice.customer_code || "—"}
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  <div>
                    <p className="text-xs text-gray-500 uppercase">
                      Email Address
                    </p>
                    <div className="mt-1">
                      {Array.isArray(invoice.customer_email) ? (
                        <div className="space-y-1">
                          {invoice.customer_email.map((email, index) => (
                            <div
                              key={index}
                              className="flex items-center text-sm"
                            >
                              <svg
                                className="h-3.5 w-3.5 text-gray-400 mr-1.5"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                                />
                              </svg>
                              {email}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="flex items-center text-sm">
                          <Mail />
                          {invoice.customer_email}
                        </div>
                      )}
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase">
                      Sales Person
                    </p>
                    <p className="font-medium">
                      {invoice.salesperson_id
                        ? `${invoice.salesperson_name} (${invoice.salesperson_short_form})`
                        : "—"}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
