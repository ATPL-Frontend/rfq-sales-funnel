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

// ✅ Define invoice shape
interface Invoice {
  id: number;
  invoice_date: string;
  customer_name: string;
  customer_email: string;
  customer_id: number;
  customer_code: string;
  amount: number | string;
  currency: string;
}

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
      // Normalize: handle { data: {...} } or plain object
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
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        Loading invoice details...
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4 text-center">
        <p className="text-muted-foreground">
          Invoice not found or no data available.
        </p>
        <Button variant="secondary" onClick={() => navigate(-1)}>
          Go Back
        </Button>
      </div>
    );
  }

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Invoice Details</CardTitle>
          <Button variant="secondary" onClick={() => navigate(-1)}>
            Back
          </Button>
        </div>
      </CardHeader>

      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-muted-foreground font-medium">Invoice ID:</p>
            <p>#{invoice.id}</p>
          </div>

          <div>
            <p className="text-muted-foreground font-medium">Invoice Date:</p>
            <p>{dateHelper(invoice.invoice_date, OFFER_EXPIRED_DATE_FORMAT)}</p>
          </div>

          <div>
            <p className="text-muted-foreground font-medium">Customer Name:</p>
            <p>{invoice.customer_name || "—"}</p>
          </div>

          <div>
            <p className="text-muted-foreground font-medium">Customer Email:</p>
            <p>{invoice.customer_email || "—"}</p>
          </div>

          <div>
            <p className="text-muted-foreground font-medium">Customer Code:</p>
            <p>{invoice.customer_code || "—"}</p>
          </div>

          <div>
            <p className="text-muted-foreground font-medium">Amount:</p>
            <p>
              {Number(invoice.amount).toLocaleString()} {invoice.currency}
            </p>
          </div>

          <div>
            <p className="text-muted-foreground font-medium">Currency:</p>
            <p>{invoice.currency}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
