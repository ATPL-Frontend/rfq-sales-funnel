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

type User = {
  id: number;
  name: string;
  email: string;
  short_form: string;
  role: string[];
  created_at: string;
};

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    short_form: "",
    role: "",
  });
  const [saving, setSaving] = useState(false);

  // ✅ Fetch Users
  const fetchUsers = useCallback(async () => {
    if (loading || !hasMore) return;

    setLoading(true);
    try {
      const { data } = await api.get(`/api/users?page=${page}&limit=20`);
      const results: User[] = data.results || [];

      setUsers((prev) => {
        const existingIds = new Set(prev.map((u) => u.id));
        const unique = results.filter((u) => !existingIds.has(u.id));
        return [...prev, ...unique];
      });

      setPage((prev) => prev + 1);
      setHasMore(data.page < data.total_pages);
    } catch (err) {
      toast.error("Failed to load users");
    } finally {
      setLoading(false);
    }
  }, [page, loading, hasMore]);

  useEffect(() => {
    fetchUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ✅ Open Edit Modal
  const handleEdit = (user: User) => {
    setSelectedUser(user);
    setForm({
      name: user.name,
      email: user.email,
      short_form: user.short_form,
      role: user.role.join(", "),
    });
    setEditOpen(true);
  };

  // ✅ Submit Edit
  const submitEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;

    setSaving(true);
    try {
      await api.put(`/api/users/${selectedUser.id}`, {
        name: form.name,
        email: form.email,
        short_form: form.short_form,
        role: form.role.split(",").map((r) => r.trim()),
      });
      toast.success("User updated successfully");

      // update locally
      setUsers((prev) =>
        prev.map((u) =>
          u.id === selectedUser.id
            ? {
                ...u,
                name: form.name,
                email: form.email,
                short_form: form.short_form,
                role: form.role.split(",").map((r) => r.trim()),
              }
            : u
        )
      );

      setEditOpen(false);
    } catch (err) {
      toast.error("Failed to update user");
    } finally {
      setSaving(false);
    }
  };

  // ✅ Delete User
  const handleDelete = (user: User) => {
    setSelectedUser(user);
    setDeleteOpen(true);
  };

  const confirmDelete = async () => {
    if (!selectedUser) return;
    try {
      await api.delete(`/api/users/${selectedUser.id}`);
      toast.success("User deleted successfully");
      setUsers((prev) => prev.filter((u) => u.id !== selectedUser.id));
      setDeleteOpen(false);
    } catch (err) {
      toast.error("Failed to delete user");
    }
  };

  const columns: Column<User>[] = [
    {
      key: "name",
      label: "Name",
      render: (row) => (
        <Link
          to={`/app/users/${row.id}`}
          className="text-primary hover:underline font-medium"
        >
          {row.name}
        </Link>
      ),
    },
    { key: "email", label: "Email" },
    {
      key: "role",
      label: "Role",
      render: (row) => row.role.join(", "),
    },
    { key: "short_form", label: "Short Form" },
    {
      key: "actions",
      label: "Actions",
      render: (row) => (
        <div className="flex gap-2">
          <Button
            onClick={() => navigate(`/app/users/${row.id}`)}
            variant="secondary"
            size="icon"
          >
            <Eye className="w-4 h-4" />
          </Button>
          <Button onClick={() => handleEdit(row)} variant="default" size="icon">
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
        data={users}
        loading={loading}
        hasMore={hasMore}
        onLoadMore={fetchUsers}
      />

      {/* ✅ Edit User Modal */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
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
              <label className="text-sm font-medium">Short Form</label>
              <Input
                value={form.short_form}
                onChange={(e) =>
                  setForm({ ...form, short_form: e.target.value })
                }
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
            <DialogTitle>Delete User</DialogTitle>
          </DialogHeader>
          <p className="text-muted-foreground">
            Are you sure you want to delete{" "}
            <span className="font-semibold">{selectedUser?.name}</span>?
          </p>
          <DialogFooter>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setDeleteOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={confirmDelete}
              variant="destructive"
              disabled={loading}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
