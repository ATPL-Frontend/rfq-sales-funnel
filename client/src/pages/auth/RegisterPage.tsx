import { useState } from "react";
import toast from "react-hot-toast";
import { Button } from "../../components/ui/button";
import { DialogFooter } from "../../components/ui/dialog";
import { Input } from "../../components/ui/input";
import api from "../../lib/api";

type User = {
  id?: number;
  name: string;
  email: string;
  password?: string;
  short_form: string;
  role_name: string;
};

type Props = {
  user: Partial<User> | null;
  onSuccess: (user: any, isEdit: boolean) => void;
  onCancel: () => void;
};

export default function UserForm({ user, onSuccess, onCancel }: Props) {
  const [form, setForm] = useState({
    name: user?.name || "",
    email: user?.email || "",
    password: "",
    short_form: user?.short_form || "",
    role: user?.role_name || "",
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (user?.id) {
        const { data } = await api.put(`/api/users/${user.id}`, {
          name: form.name,
          email: form.email,
          short_form: form.short_form,
          role: form.role.split(",").map((r) => r.trim()),
        });
        toast.success("User updated successfully");
        onSuccess(data.data || data, true);
      } else {
        const { data } = await api.post(`/api/users`, {
          name: form.name,
          email: form.email,
          password: form.password,
          short_form: form.short_form,
          role: form.role.split(",").map((r) => r.trim()),
        });
        toast.success("User created successfully");
        onSuccess(data.data || data, false);
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to save user");
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

      {!user?.id && (
        <div className="space-y-2">
          <label className="text-sm font-medium">Password</label>
          <Input
            type="password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            required
          />
        </div>
      )}

      <div className="space-y-2">
        <label className="text-sm font-medium">Short Form</label>
        <Input
          value={form.short_form}
          onChange={(e) => setForm({ ...form, short_form: e.target.value })}
          required
        />
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium">Role</label>
        <Input
          value={form.role}
          onChange={(e) => setForm({ ...form, role: e.target.value })}
          placeholder="e.g. admin, sales-person"
          required
        />
      </div>

      <DialogFooter>
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={saving}>
          {saving ? "Saving..." : user?.id ? "Save Changes" : "Create User"}
        </Button>
      </DialogFooter>
    </form>
  );
}
