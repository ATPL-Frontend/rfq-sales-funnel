import { AsyncSearchSelect } from "@/components/AsyncSearchSelect";
import { useState } from "react";
import toast from "react-hot-toast";
import { Button } from "../../components/ui/button";
import { DialogFooter } from "../../components/ui/dialog";
import { Input } from "../../components/ui/input";
import api from "../../lib/api";
import { Checkbox } from "../ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";

type Invoice = {
  id: number;
  invoice_date: string;
  create_invoice_date: string;
  customer_name: string;
  invoice_no: string;
  customer_email: string;
  customer_id: number;
  customer_code: string;
  amount: number;
  gst: boolean;
  currency: string;
};

type Customer = {
  id: number;
  name: string;
  email: string[];
  code: string;
  currency: "AUD" | "USD";
  gst: 0 | 1;
};

type Props = {
  invoice: Partial<Invoice> | null;
  onSuccess: (invoice: any, isEdit: boolean) => void;
  onCancel: () => void;
};

export default function InvoiceForm({ invoice, onSuccess, onCancel }: Props) {
  const isEditMode = Boolean(invoice?.id);

  const [form, setForm] = useState({
    invoice_date: invoice?.invoice_date
      ? new Date(invoice.invoice_date).toISOString().split("T")[0]
      : "",
    create_invoice_date: invoice?.create_invoice_date
      ? new Date(invoice.create_invoice_date).toISOString().split("T")[0]
      : "",
    customer_id: invoice?.customer_id ? String(invoice.customer_id) : "",
    // ✅ MULTIPLE INVOICES
    items: [
      {
        invoice_no: invoice?.invoice_no || "",
        amount: invoice?.amount ? invoice.amount.toString() : "",
        gst: invoice?.gst ?? true,
        currency: invoice?.currency || "AUD",
      },
    ],
  });

  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isEditMode && form.items.length !== 1) {
      toast.error("Only one invoice can be edited at a time");
      return;
    }

    setSaving(true);
    try {
      if (invoice) {
        const item = form.items[0]; // only one item in edit mode

        const payload = {
          invoice_date: form.invoice_date,
          create_invoice_date: form.create_invoice_date || null,
          customer_id: Number(form.customer_id),
          invoice_no: item.invoice_no,
          amount: Number(item.amount),
          currency: item.currency,
          gst: item.gst,
        };
        const { data } = await api.put(`/api/invoices/${invoice.id}`, payload);
        const updatedInvoice = data.data || data; // normalize
        toast.success("Invoice updated successfully");
        onSuccess(updatedInvoice, true);
      } else {
        const { data } = await api.post(`/api/invoices`, form);
        const newInvoice = data.data || data;
        toast.success("Invoice created successfully");
        onSuccess(newInvoice, false);
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to save invoice");
    } finally {
      setSaving(false);
    }
  };

  const addInvoiceItem = () => {
    setForm((prev) => {
      // Try to inherit from last item
      const lastItem = prev.items[prev.items.length - 1];

      return {
        ...prev,
        items: [
          ...prev.items,
          {
            invoice_no: "",
            amount: "",
            gst: lastItem?.gst ?? true,
            currency: lastItem?.currency || "AUD",
          },
        ],
      };
    });
  };

  const removeInvoiceItem = (index: number) => {
    setForm((prev) => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index),
    }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      <div className="space-y-2">
        <label className="text-sm font-medium">Invoice Sent Date</label>
        <Input
          type="date"
          value={form.invoice_date}
          onChange={(e) => setForm({ ...form, invoice_date: e.target.value })}
          required
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Invoice Create Date</label>
        <Input
          type="date"
          value={form.create_invoice_date}
          onChange={(e) =>
            setForm({ ...form, create_invoice_date: e.target.value })
          }
          // required
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Customer</label>
        <AsyncSearchSelect<Customer>
          value={form.customer_id}
          placeholder="Select customer"
          getKey={(c) => String(c.id)}
          displayValue={(c) => `${c.name} (Code - ${c.code})`}
          fetchOptions={async (query, page) => {
            const { data } = await api.get("/api/customers", {
              params: {
                page,
                limit: 20,
                q: query,
              },
            });

            return {
              data: data.data || [],
              hasMore: data.page < data.total_pages,
            };
          }}
          onChange={(c) => {
            setForm((prev) => ({
              ...prev,
              customer_id: String(c.id),
              items: prev.items.map((item) => ({
                ...item,
                currency: c.currency,
                gst: Boolean(c.gst),
              })),
            }));
          }}
        />
      </div>

      {form.items.map((item, index) => (
        <div key={index} className="border rounded-md p-2 space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium">Invoice #{index + 1}</span>
            {!isEditMode && form.items.length > 1 && (
              <Button
                type="button"
                variant="ghost"
                className="text-red-500"
                onClick={() => removeInvoiceItem(index)}
                size="sm"
              >
                Remove
              </Button>
            )}
          </div>

          <Input
            placeholder="Invoice No"
            value={item.invoice_no}
            onChange={(e) => {
              const v = e.target.value;
              setForm((prev) => {
                const items = [...prev.items];
                items[index].invoice_no = v;
                return { ...prev, items };
              });
            }}
            required
          />

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1 col-span-2">
              <div className="flex justify-between items-center">
                <label className="text-sm font-medium">Amount</label>

                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={item.gst}
                    onCheckedChange={(checked) => {
                      setForm((prev) => {
                        const items = [...prev.items];
                        items[index].gst = Boolean(checked);
                        return { ...prev, items };
                      });
                    }}
                  />
                  <label
                    htmlFor="gst"
                    className={`text-sm font-semibold transition-colors ${
                      item.gst ? "text-primary" : "text-gray-400"
                    }`}
                  >
                    GST Included
                  </label>
                </div>
              </div>

              <Input
                type="number"
                placeholder="Amount"
                value={item.amount}
                onChange={(e) => {
                  const v = e.target.value;
                  setForm((prev) => {
                    const items = [...prev.items];
                    items[index].amount = v;
                    return { ...prev, items };
                  });
                }}
                required
              />
            </div>

            <div className="space-y-2 -mt-1">
              <label className="text-sm font-medium">Currency</label>
              <Select
                value={item.currency}
                onValueChange={(value) => {
                  setForm((prev) => {
                    const items = [...prev.items];
                    items[index].currency = value;
                    return { ...prev, items };
                  });
                }}
              >
                <SelectTrigger className="w-full mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="AUD">AUD</SelectItem>
                  <SelectItem value="USD">USD</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      ))}

      <DialogFooter>
        <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          {/* Left / Top */}
          {!isEditMode && (
            <Button
              type="button"
              variant="outline"
              onClick={addInvoiceItem}
              className="w-full sm:w-auto text-primary"
            >
              + More Invoice
            </Button>
          )}

          {/* Right / Bottom */}
          <div className="flex gap-2 justify-end">
            <Button type="button" variant="secondary" onClick={onCancel}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving
                ? "Saving..."
                : invoice
                  ? "Save Changes"
                  : "Create Invoice"}
            </Button>
          </div>
        </div>
      </DialogFooter>
    </form>
  );
}
