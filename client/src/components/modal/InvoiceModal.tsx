import { Check, ChevronsUpDown } from "lucide-react";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Button } from "../../components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "../../components/ui/command";
import { DialogFooter } from "../../components/ui/dialog";
import { Input } from "../../components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "../../components/ui/popover";
import api from "../../lib/api";
import { cn } from "../../lib/utils";
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
  customer_name: string;
  customer_email: string;
  customer_id: number;
  customer_code: string;
  amount: number;
  currency: string;
};

type Props = {
  invoice: Partial<Invoice> | null;
  onSuccess: (invoice: any, isEdit: boolean) => void;
  onCancel: () => void;
};

export default function InvoiceForm({ invoice, onSuccess, onCancel }: Props) {
  console.log("InvoiceForm invoice:", invoice);
  const [form, setForm] = useState({
    invoice_date: invoice?.invoice_date
      ? new Date(invoice.invoice_date).toISOString().split("T")[0]
      : "",
    customer_id: invoice?.customer_id ? String(invoice.customer_id) : "",
    amount: invoice?.amount ? invoice.amount.toString() : "",
    currency: invoice?.currency || "AUD",
  });

  const [saving, setSaving] = useState(false);
  const [customers, setCustomers] = useState<
    { id: number; name: string; email: string; code: string }[]
  >([]);
  const [open, setOpen] = useState(false);
  const [loadingCustomers, setLoadingCustomers] = useState(false);

  const fetchCustomers = async () => {
    if (customers.length > 0 || loadingCustomers) return;
    setLoadingCustomers(true);
    try {
      const { data } = await api.get("/api/customers?limit=100");
      setCustomers(data.data || []);
    } catch (err) {
      toast.error("Failed to load customers");
    } finally {
      setLoadingCustomers(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (invoice) {
        const { data } = await api.put(`/api/invoices/${invoice.id}`, form);
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

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <label className="text-sm font-medium">Invoice Date</label>
        <Input
          type="date"
          value={form.invoice_date}
          onChange={(e) => setForm({ ...form, invoice_date: e.target.value })}
          required
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Customer</label>
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              className={cn(
                "w-full justify-between",
                !form.customer_id && "text-muted-foreground"
              )}
            >
              {form.customer_id
                ? customers.find((c) => c.id === Number(form.customer_id))
                    ?.name || "Select customer"
                : "Select customer"}
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-(--radix-popover-trigger-width) p-0">
            <Command>
              <CommandInput placeholder="Search customer..." />
              <CommandList>
                <CommandEmpty>No customers found.</CommandEmpty>
                <CommandGroup>
                  {customers.map((c) => (
                    <CommandItem
                      key={c.id}
                      value={c.name}
                      onSelect={() => {
                        setForm({ ...form, customer_id: String(c.id) });
                        setOpen(false);
                      }}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          String(c.id) === form.customer_id
                            ? "opacity-100"
                            : "opacity-0"
                        )}
                      />
                      {c.name}{" "}
                      <span className="text-muted-foreground ml-1 text-xs">
                        ({c.email} - {c.code})
                      </span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Amount</label>
        <Input
          type="number"
          value={form.amount}
          onChange={(e) => setForm({ ...form, amount: e.target.value })}
          required
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Currency</label>
        <Select
          value={form.currency}
          onValueChange={(value: string) =>
            setForm({ ...form, currency: value })
          }
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select currency" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="AUD">AUD</SelectItem>
            <SelectItem value="USD">USD</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <DialogFooter>
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={saving}>
          {saving ? "Saving..." : invoice ? "Save Changes" : "Create Invoice"}
        </Button>
      </DialogFooter>
    </form>
  );
}
