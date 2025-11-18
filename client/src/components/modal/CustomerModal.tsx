import { useState } from "react";
import toast from "react-hot-toast";
import { Button } from "../../components/ui/button";
import { DialogFooter } from "../../components/ui/dialog";
import { Input } from "../../components/ui/input";
import api from "../../lib/api";

export type Customer = {
  id: number;
  name: string;
  email: string;
  web_address: string;
  code: string;
  created_at: string;
  updated_at: string;
};

type Props = {
  customer: Customer | null; // null = create mode
  onSuccess: (customer: Customer, isEdit: boolean) => void;
  onCancel: () => void;
};

export default function CustomerForm({ customer, onSuccess, onCancel }: Props) {
  const [form, setForm] = useState({
    name: customer?.name || "",
    email: customer?.email || "",
    web_address: customer?.web_address || "",
    code: customer?.code || "",
  });
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
        <Input
          type="email"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          placeholder="abc@example.com"
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
