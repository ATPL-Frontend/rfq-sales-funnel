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
// import { Input } from "../../components/ui/input";
import api from "../../lib/api";
import UserForm from "../auth/RegisterPage";

type User = {
  id: number;
  name: string;
  email: string;
  short_form: string;
  role_name: string;
  created_at: string;
};

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const navigate = useNavigate();

  // ✅ Fetch Users
  const fetchUsers = useCallback(async () => {
    if (loading || !hasMore || failed) return;
    setLoading(true);
    try {
      const { data } = await api.get(`/api/users?page=${page}&limit=20`);
      const results: User[] = data.data || [];

      setUsers((prev) => {
        const existingIds = new Set(prev.map((u) => u.id));
        const unique = results.filter((u) => !existingIds.has(u.id));
        return [...prev, ...unique];
      });

      setPage((prev) => prev + 1);
      setHasMore(data.page < data.total_pages);
    } catch {
      toast.error("Failed to load users");
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }, [page, loading, hasMore, failed]);

  useEffect(() => {
    fetchUsers();
  }, []);

  // ✅ Create new user
  const handleCreate = () => {
    setSelectedUser(null);
    setFormOpen(true);
  };

  // ✅ Edit existing user
  const handleEdit = (user: User) => {
    setSelectedUser(user);
    setFormOpen(true);
  };

  // ✅ Delete user
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
    } catch {
      toast.error("Failed to delete user");
    }
  };

  // ✅ When user form succeeds
  const handleFormSuccess = (user: User, isEdit: boolean) => {
    if (isEdit) {
      setUsers((prev) =>
        prev.map((u) => (u.id === user.id ? { ...u, ...user } : u))
      );
    } else {
      setUsers((prev) => [user, ...prev]);
    }
    setFormOpen(false);
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
      render: (row) => row.role_name,
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
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-xl font-semibold">Users</h1>
        <Button onClick={handleCreate}>Add User</Button>
      </div>

      <CommonTable
        columns={columns}
        data={users}
        loading={loading}
        hasMore={hasMore}
        onLoadMore={fetchUsers}
      />

      {/* ✅ Create/Edit User Modal */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {selectedUser ? "Edit User" : "Create User"}
            </DialogTitle>
          </DialogHeader>
          <UserForm
            user={selectedUser}
            onSuccess={handleFormSuccess}
            onCancel={() => setFormOpen(false)}
          />
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
            <Button variant="secondary" onClick={() => setDeleteOpen(false)}>
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
