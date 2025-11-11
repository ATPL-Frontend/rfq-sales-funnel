import { useState } from "react";
import toast from "react-hot-toast";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { DialogFooter } from "../../components/ui/dialog";
import api from "../../lib/api";

export type Customer = {
  id: number;
  name: string;
  email: string;
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
        <label className="text-sm font-medium">Name</label>
        <Input
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          required
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Email</label>
        <Input
          type="email"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          required
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Code</label>
        <Input
          value={form.code}
          onChange={(e) => setForm({ ...form, code: e.target.value })}
          required
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
