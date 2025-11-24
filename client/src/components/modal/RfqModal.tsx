import api from "@/lib/api";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";

import { Button } from "../ui/button";
import { Input } from "../ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";

import { cn } from "@/lib/utils";
import { Check, ChevronsUpDown } from "lucide-react";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "../ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";

import { DialogFooter } from "../ui/dialog";

type Rfq = {
  id: number;
  receive_date: string;
  start_date: string;
  customer_id: number;
  salesperson_id: number;
  quantity: number;
  price: number;
  currency: string;
  prepared_by: number[];
  end_date: string;
  progress: string;
  rfq_location: string;
  remarks: string;
  created_at: string;
};

type SalesPerson = {
  id: number;
  name: string;
  short_form: string;
};

type Props = {
  rfq: Rfq | null;
  salesPerson: SalesPerson[] | null;
  onSuccess: (rfq: any, isEdit: boolean) => void;
  onCancel: () => void;
};

const PROGRESS_OPTIONS = [
  "Waiting for Drawing",
  "Waiting for Customer's BOM",
  "Waiting for vendor quotation",
  "Waiting for Salesperson",
  "Waiting for Drawing Revision",
  "Salesperson will cover rest",
  "Partially Submitted",
  "Sent to Salesperson (100%)",
  "Sent to Customer (Done)",
];

export default function RfqForm({
  rfq,
  salesPerson,
  onSuccess,
  onCancel,
}: Props) {
  const [saving, setSaving] = useState(false);
  const [customers, setCustomers] = useState<
    { id: number; name: string; code: string }[]
  >([]);

  const [customerOpen, setCustomerOpen] = useState(false);

  // -------------------------
  // FORM STATE (clean)
  // -------------------------
  const [form, setForm] = useState({
    receive_date: rfq?.receive_date || "",
    start_date: rfq?.start_date || "",
    end_date: rfq?.end_date || "",
    customer_id: rfq?.customer_id ? String(rfq.customer_id) : "",
    salesperson_id: rfq?.salesperson_id ? String(rfq.salesperson_id) : "",
    quantity: rfq?.quantity || "",
    price: rfq?.price || "",
    currency: rfq?.currency || "AUD",
    progress: rfq?.progress || "",
    rfq_location: rfq?.rfq_location || "",
    remarks: rfq?.remarks || "",
  });

  // -------------------------
  // LOAD CUSTOMERS
  // -------------------------
  const fetchCustomers = async () => {
    try {
      const { data } = await api.get("/api/customers?limit=200");
      setCustomers(data.data || []);
    } catch (err) {
      toast.error("Failed to load customers");
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  // -------------------------
  // SUBMIT HANDLER
  // -------------------------
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      let response;

      if (rfq) {
        response = await api.put(`/api/rfqs/${rfq.id}`, form);
        toast.success("RFQ updated successfully");
        onSuccess(response.data.data || response.data, true);
      } else {
        response = await api.post("/api/rfqs", form);
        toast.success("RFQ created successfully");
        onSuccess(response.data.data || response.data, false);
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to save RFQ");
    } finally {
      setSaving(false);
    }
  };

  // -------------------------
  // RENDER
  // -------------------------
  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      <div className="space-y-1 flex gap-2">
        {/* Receive Date */}
        <div className="space-y-1 flex-1">
          <label className="text-sm font-medium">Receive Date</label>
          <Input
            type="date"
            value={form.receive_date}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, receive_date: e.target.value }))
            }
            required
          />
        </div>

        {/* Start Date */}
        <div className="space-y-1 flex-1">
          <label className="text-sm font-medium">Start Date</label>
          <Input
            type="date"
            value={form.start_date}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, start_date: e.target.value }))
            }
          />
        </div>
      </div>

      {/* CUSTOMER */}
      <div className="space-y-1">
        <label className="text-sm font-medium">Customer</label>

        <Popover open={customerOpen} onOpenChange={setCustomerOpen} modal>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "w-full justify-between overflow-hidden",
                !form.customer_id && "text-muted-foreground"
              )}
            >
              <span className="truncate max-w-[90%]">
                {form.customer_id
                  ? customers.find((c) => c.id === Number(form.customer_id))
                      ?.name || "Select customer"
                  : "Select customer"}
              </span>
              <ChevronsUpDown className="w-4 h-4 opacity-50" />
            </Button>
          </PopoverTrigger>

          <PopoverContent className="w-(--radix-popover-trigger-width) p-0">
            <Command className="max-h-64 overflow-y-auto">
              <CommandInput placeholder="Search customer..." />
              <CommandList>
                <CommandEmpty>No customers found.</CommandEmpty>
                <CommandGroup>
                  {customers.map((c) => (
                    <CommandItem
                      key={c.id}
                      value={c.name}
                      onSelect={() => {
                        setForm((prev) => ({
                          ...prev,
                          customer_id: String(c.id),
                        }));
                        setCustomerOpen(false);
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
                      <span className="text-muted-foreground text-xs ml-1">
                        (Code - {c.code})
                      </span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>

      {/* Salesperson */}
      <div className="space-y-1">
        <label className="text-sm font-medium">Salesperson</label>
        <Select
          value={form.salesperson_id}
          onValueChange={(value) =>
            setForm((prev) => ({ ...prev, salesperson_id: value }))
          }
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select salesperson" />
          </SelectTrigger>
          <SelectContent>
            {salesPerson?.map((s) => (
              <SelectItem key={s.id} value={String(s.id)}>
                {s.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

    <div className="space-y-1 flex gap-2">
      {/* Quantity */}
      <div className="space-y-1 flex-1">
        <label className="text-sm font-medium">Quantity</label>
        <Input
          type="number"
          value={form.quantity}
          onChange={(e) =>
            setForm((prev) => ({ ...prev, quantity: Number(e.target.value) }))
          }
        />
      </div>

      {/* End Date */}
      <div className="space-y-1 flex-1">
        <label className="text-sm font-medium">End Date</label>
        <Input
          type="date"
          value={form.end_date}
          onChange={(e) =>
            setForm((prev) => ({ ...prev, end_date: e.target.value }))
          }
        />
      </div>
</div>
      <div className="space-y-1 flex gap-2">
        {/* Price */}
        <div className="space-y-1 flex-1">
          <label className="text-sm font-medium">Price</label>
          <Input
            type="number"
            value={form.price}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, price: Number(e.target.value) }))
            }
          />
        </div>

        {/* Currency */}
        <div className="space-y-1 flex-1">
          <label className="text-sm font-medium">Currency</label>
          <Select
            value={form.currency}
            onValueChange={(value) =>
              setForm((prev) => ({ ...prev, currency: value }))
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
      </div>

      {/* Progress */}
      <div className="space-y-1">
        <label className="text-sm font-medium">Progress</label>
        <Select
          value={form.progress}
          onValueChange={(value) =>
            setForm((prev) => ({ ...prev, progress: value }))
          }
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select progress" />
          </SelectTrigger>
          <SelectContent>
            {PROGRESS_OPTIONS.map((option) => (
              <SelectItem key={option} value={option}>
                {option}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* RFQ Location */}
      <div className="space-y-1">
        <label className="text-sm font-medium">RFQ Location</label>
        <Input
          type="text"
          value={form.rfq_location}
          onChange={(e) =>
            setForm((prev) => ({ ...prev, rfq_location: e.target.value }))
          }
        />
      </div>

      {/* Remarks */}
      <div className="space-y-1">
        <label className="text-sm font-medium">Remarks</label>
        <Input
          type="text"
          value={form.remarks}
          onChange={(e) =>
            setForm((prev) => ({ ...prev, remarks: e.target.value }))
          }
        />
      </div>

      <DialogFooter>
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>

        <Button type="submit" disabled={saving}>
          {saving ? "Saving..." : rfq ? "Save Changes" : "Create RFQ"}
        </Button>
      </DialogFooter>
    </form>
  );
}
