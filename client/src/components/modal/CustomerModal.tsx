import SearchSelectPopover from "@/components/SearchSelectPopover";
import type { CustomerList, SalesPerson } from "@/types/index.ts";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Button } from "../../components/ui/button";
import { DialogFooter } from "../../components/ui/dialog";
import { Input } from "../../components/ui/input";
import api from "../../lib/api";
import TagsInput from "../TagsInput";
import { Checkbox } from "../ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";

type Props = {
  customer: CustomerList | null; // null = create mode
  onSuccess: (customer: CustomerList, isEdit: boolean) => void;
  onCancel: () => void;
};

export default function CustomerForm({ customer, onSuccess, onCancel }: Props) {
  const [form, setForm] = useState({
    name: customer?.name || "",
    email: customer?.email || [],
    web_address: customer?.web_address || "",
    code: customer?.code || "",
    salesperson_id: customer?.salesperson_id || null,
    currency: customer?.currency || "AUD",
    gst: customer?.gst ?? 1,
  });
  const [salespersons, setSalespersons] = useState<SalesPerson[]>([]);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (customer) {
        // update existing
        const { data } = await api.put(`/api/customers/${customer.id}`, form);
        const updated = data.data || data;
        toast.success("Customer updated successfully");
        onSuccess(updated, true);
      } else {
        // create new
        const { data } = await api.post(`/api/customers`, form);
        const created = data.data || data;
        toast.success("Customer created successfully");
        onSuccess(created, false);
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to save customer");
    } finally {
      setSaving(false);
    }
  };

  const fetchSalesPersons = async () => {
    if (salespersons.length > 0) return;
    try {
      const { data } = await api.get("/api/users?limit=200&role=sales-person");
      const allUsers = data.data || [];
      setSalespersons(allUsers);
    } catch (err) {
      toast.error("Failed to load sales persons or users list");
    }
  };

  useEffect(() => {
    fetchSalesPersons();
  }, []);

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <label className="text-sm font-medium">Name</label>{" "}
        <span className="text-red-500">*</span>
        <Input
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          placeholder="Watlow"
          required
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Email</label>
        <TagsInput
          value={form.email}
          onChange={(emails: any) => setForm({ ...form, email: emails })}
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Web Address</label>
        <Input
          value={form.web_address}
          onChange={(e) => setForm({ ...form, web_address: e.target.value })}
          placeholder="www.watlow.com"
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Code</label>
        <Input
          value={form.code}
          onChange={(e) => setForm({ ...form, code: e.target.value })}
          placeholder="WAT123"
        />
      </div>

      <SearchSelectPopover
        label="Sales Person"
        options={salespersons}
        value={form.salesperson_id}
        onChange={(val) =>
          setForm((prev) => ({
            ...prev,
            salesperson_id: val ? Number(val) : null,
          }))
        }
        placeholder="Select customer"
      />

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">Default Currency</label>
          <Select
            value={form.currency}
            onValueChange={(value: string) =>
              setForm({ ...form, currency: value })
            }
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="$ Select currency" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="AUD">AUD</SelectItem>
              <SelectItem value="USD">USD</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-3 mt-4">
          <Checkbox
            id="gst"
            checked={!!form.gst}
            onCheckedChange={(checked) =>
              setForm((prev) => ({ ...prev, gst: Boolean(checked) }))
            }
          />
          <label
            htmlFor="gst"
            className={`text-sm font-semibold transition-colors ${
              form.gst ? "text-primary" : "text-gray-400"
            }`}
          >
            GST Included (Default)
          </label>
        </div>
      </div>

      <DialogFooter>
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={saving}>
          {saving ? "Saving..." : customer ? "Save Changes" : "Create Customer"}
        </Button>
      </DialogFooter>
    </form>
  );
}
