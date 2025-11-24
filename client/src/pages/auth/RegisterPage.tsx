import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  user_type?: "system_user" | "sales_person";
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
    user_type: user?.user_type || "system_user",
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload: any = {
        name: form.name,
        email: form.email || null,
        short_form: form.short_form,
        role: form.role,
        user_type: form.user_type,
      };

      if (form.user_type === "system_user" && form.password) {
        payload.password = form.password;
      }

      let data;

      if (user?.id) {
        const res = await api.put(`/api/users/${user.id}`, payload);
        data = res.data;
        toast.success("User updated successfully");
        onSuccess(data.data || data, true);
      } else {
        const res = await api.post(`/api/auth/register`, payload);
        data = res.data;
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
      {/* ✅ User type selection (styled as cards) */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">User Type</Label>

        <RadioGroup
          value={form.user_type}
          onValueChange={(v: "system_user" | "sales_person") =>
            setForm({ ...form, user_type: v })
          }
          className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2"
        >
          {/* System User Card */}
          <label
            htmlFor="sys"
            className={`flex items-start gap-3 border rounded-lg p-3 cursor-pointer transition-all ${
              form.user_type === "system_user"
                ? "border-primary bg-primary/5"
                : "border-gray-300"
            }`}
          >
            <RadioGroupItem value="system_user" id="sys" className="mt-1" />
            <div>
              <span className="font-semibold text-sm leading-tight">
                System User
              </span>
              <p className="text-xs text-muted-foreground">
                Has login access and can use the system.
              </p>
            </div>
          </label>

          {/* Sales Person Card */}
          <label
            htmlFor="sales"
            className={`flex items-start gap-3 border rounded-lg p-3 cursor-pointer transition-all ${
              form.user_type === "sales_person"
                ? "border-primary bg-primary/5"
                : "border-gray-300"
            }`}
          >
            <RadioGroupItem value="sales_person" id="sales" className="mt-1" />
            <div>
              <span className="font-semibold text-sm leading-tight">
                Sales Person
              </span>
              <p className="text-xs text-muted-foreground">
                Doesn’t require login. Used for sales tracking only.
              </p>
            </div>
          </label>
        </RadioGroup>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Name</label>{" "}
        <span className="text-red-500">*</span>
        <Input
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          required
          placeholder="John Doe"
        />
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium">Email</label>
        {form.user_type === "system_user" && <span className="text-red-500">*</span>}
        <Input
          type="email"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          disabled={form.user_type === "sales_person"}
          placeholder={
            form.user_type === "sales_person"
              ? "Not required for Sales Person"
              : "user@example.com"
          }
          required={form.user_type !== "sales_person"}
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Short Form</label>
        <Input
          value={form.short_form}
          onChange={(e) => setForm({ ...form, short_form: e.target.value })}
          placeholder="JD"
          className="uppercase"
        />
      </div>

      {form.user_type === "system_user" && (
        <div className="space-y-2">
          <Label>Role</Label>
          <Select
            value={form.role}
            onValueChange={(value) => setForm({ ...form, role: value })}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select role" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="admin">Admin</SelectItem>
              <SelectItem value="super-admin">Super Admin</SelectItem>
              <SelectItem value="user">User</SelectItem>
              <SelectItem value="sales-person">Sales Person</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      {/* ✅ Password visible only for system user */}
      {form.user_type === "system_user" && !user?.id && (
        <div className="space-y-2">
          <Label>Password</Label>
          <Input
            type="password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            placeholder="Enter password"
            required={form.user_type === "system_user"}
          />
        </div>
      )}

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
