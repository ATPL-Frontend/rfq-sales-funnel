import { Edit, Eye, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Link, useNavigate } from "react-router-dom";
import type { Column } from "../../components/CommonTable";
import CommonTable from "../../components/CommonTable";
import { Button } from "../../components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../components/ui/dialog";
import { Input } from "../../components/ui/input";
import api from "../../lib/api";

type Customer = {
  id: number;
  name: string;
  email: string;
  code: string;
  created_at: string;
  updated_at: string;
};

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const navigate = useNavigate();

  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(
    null
  );
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", code: "" });

  // ✅ Fetch customers with infinite scroll
  const fetchCustomers = useCallback(async () => {
    if (loading || !hasMore) return;

    setLoading(true);
    try {
      const { data } = await api.get(`/api/customers?page=${page}&limit=20`);
      const results: Customer[] = data.results || [];

      setCustomers((prev) => {
        const existingIds = new Set(prev.map((c) => c.id));
        const unique = results.filter((c) => !existingIds.has(c.id));
        return [...prev, ...unique];
      });

      setPage((prev) => prev + 1);
      setHasMore(data.page < data.total_pages);
    } catch (err) {
      toast.error("Failed to load customers");
    } finally {
      setLoading(false);
    }
  }, [page, loading, hasMore]);

  useEffect(() => {
    fetchCustomers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ✅ Edit Modal logic
  const handleEdit = (customer: Customer) => {
    setSelectedCustomer(customer);
    setForm({
      name: customer.name,
      email: customer.email,
      code: customer.code,
    });
    setEditOpen(true);
  };

  const submitEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer) return;

    setSaving(true);
    try {
      await api.put(`/api/customers/${selectedCustomer.id}`, {
        name: form.name,
        email: form.email,
        code: form.code,
      });
      toast.success("Customer updated successfully");

      // Update locally
      setCustomers((prev) =>
        prev.map((c) =>
          c.id === selectedCustomer.id
            ? { ...c, ...form, updated_at: new Date().toISOString() }
            : c
        )
      );

      setEditOpen(false);
    } catch (err) {
      toast.error("Failed to update customer");
    } finally {
      setSaving(false);
    }
  };

  // ✅ Delete Modal logic
  const handleDelete = (customer: Customer) => {
    setSelectedCustomer(customer);
    setDeleteOpen(true);
  };

  const confirmDelete = async () => {
    if (!selectedCustomer) return;
    try {
      await api.delete(`/api/customers/${selectedCustomer.id}`);
      toast.success("Customer deleted successfully");
      setCustomers((prev) => prev.filter((c) => c.id !== selectedCustomer.id));
      setDeleteOpen(false);
    } catch (err) {
      toast.error("Failed to delete customer");
    }
  };

  const columns: Column<Customer>[] = [
    {
      key: "name",
      label: "Name",
      render: (row) => (
        <Link
          to={`/app/customers/${row.id}`}
          className="text-primary hover:underline font-medium"
        >
          {row.name}
        </Link>
      ),
    },
    { key: "email", label: "Email" },
    { key: "code", label: "Code" },
    {
      key: "actions",
      label: "Actions",
      render: (row) => (
        <div className="flex gap-2">
          <Button
            onClick={() => navigate(`/app/customers/${row.id}`)}
            variant="secondary"
            size="icon"
          >
            <Eye className="w-4 h-4" />
          </Button>
          <Button onClick={() => handleEdit(row)} size="icon">
            <Edit className="w-4 h-4" />
          </Button>
          <Button
            onClick={() => handleDelete(row)}
            variant="destructive"
            size="icon"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <>
      <CommonTable
        columns={columns}
        data={customers}
        loading={loading}
        hasMore={hasMore}
        onLoadMore={fetchCustomers}
      />

      {/* ✅ Edit Customer Modal */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Customer</DialogTitle>
          </DialogHeader>
          <form onSubmit={submitEdit} className="space-y-4">
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
              <Button
                type="button"
                variant="secondary"
                onClick={() => setEditOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? "Saving..." : "Save"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ✅ Delete Confirmation Modal */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Customer</DialogTitle>
          </DialogHeader>
          <p className="text-muted-foreground">
            Are you sure you want to delete{" "}
            <span className="font-semibold">{selectedCustomer?.name}</span>?
          </p>
          <DialogFooter>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setDeleteOpen(false)}
            >
              Cancel
            </Button>
            <Button onClick={confirmDelete} variant="destructive">
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
