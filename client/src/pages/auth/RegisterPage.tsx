import UserSelectPopover from "@/components/SearchSelectPopover";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Button } from "../../components/ui/button";
import { DialogFooter } from "../../components/ui/dialog";
import { Input } from "../../components/ui/input";
import api from "../../lib/api";
import type { UserList } from "../../types";

type Props = {
  user: UserList | null;
  roles: string[]; // this is your roles list from API
  onSuccess: (user: any, isEdit: boolean) => void;
  onCancel: () => void;
};

export default function UserForm({ user, roles, onSuccess, onCancel }: Props) {
  const [form, setForm] = useState<{
    name: string;
    email: string;
    password: string;
    short_form: string;
    roles: string[]; // IMPORTANT: roles = array of role names
    user_type: "system_user" | "sales_person";
  }>({
    name: user?.name || "",
    email: user?.email || "",
    password: "",
    short_form: user?.short_form || "",
    roles: user?.roles || [], // user.roles already returns ["admin","user"]
    user_type: user?.user_type || "system_user",
  });

  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setForm({
      name: user?.name || "",
      email: user?.email || "",
      password: "",
      short_form: user?.short_form || "",
      roles: (user?.roles as string[]) || [],
      user_type: user?.user_type || "system_user",
    });
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const payload = {
        name: form.name,
        email: form.email || null,
        short_form: form.short_form,
        roles: form.roles, // names only
        user_type: form.user_type,
        ...(form.password ? { password: form.password } : {}),
      };

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
      {/* USER TYPE */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">User Type</Label>

        <RadioGroup
          value={form.user_type}
          onValueChange={(v: "system_user" | "sales_person") =>
            setForm({ ...form, user_type: v })
          }
          className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2"
        >
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
              <span className="font-semibold text-sm">System User</span>
              <p className="text-xs text-muted-foreground">
                Has login access and can use the system.
              </p>
            </div>
          </label>

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
              <span className="font-semibold text-sm">Sales Person</span>
              <p className="text-xs text-muted-foreground">
                Doesn’t require login. Used for sales tracking only.
              </p>
            </div>
          </label>
        </RadioGroup>
      </div>

      {/* NAME */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Name</label>
        <span className="text-red-500">*</span>
        <Input
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          required
          placeholder="John Doe"
        />
      </div>

      {/* EMAIL */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Email</label>
        {form.user_type === "system_user" && (
          <span className="text-red-500">*</span>
        )}
        <Input
          type="email"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          disabled={form.user_type === "sales_person" || !!user?.id}
          placeholder={
            form.user_type === "sales_person"
              ? "Not required for Sales Person"
              : "user@example.com"
          }
          required={form.user_type !== "sales_person"}
        />
      </div>

      {/* SHORT FORM */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Short Form</label>
        <Input
          value={form.short_form}
          onChange={(e) => setForm({ ...form, short_form: e.target.value })}
          placeholder="JD"
          className="uppercase"
        />
      </div>

      {/* ROLES — MULTI SELECT ONLY (System User Only) */}
      {form.user_type === "system_user" && (
        <UserSelectPopover
          label="Roles"
          options={roles.map((r) => ({ id: r, name: r }))}
          value={form.roles}
          onChange={(value) => setForm({ ...form, roles: value as string[] })}
          multiple
          searchable={false}
        />
      )}

      {/* PASSWORD */}
      {form.user_type === "system_user" && !user?.id && (
        <div className="space-y-2">
          <Label>Password</Label>
          <Input
            type="password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            placeholder="Enter password"
            required
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
