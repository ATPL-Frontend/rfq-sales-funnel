import { Badge } from "@/components/ui/badge";
import { Edit, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Link } from "react-router-dom";
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
import api from "../../lib/api";
import CustomerForm from "./../../components/modal/CustomerModal";
import type { CustomerList } from "@/types/index.ts";

export default function CustomersPage() {
  const [customers, setCustomers] = useState<CustomerList[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);

  const [selectedCustomer, setSelectedCustomer] = useState<CustomerList | null>(
    null
  );
  const [totalCustomers, setTotalCustomers] = useState(0);
  const [formOpen, setFormOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  // ✅ Fetch customers with infinite scroll
  const fetchCustomers = useCallback(async () => {
    if (loading || !hasMore || failed) return;

    setLoading(true);
    try {
      const { data } = await api.get(`/api/customers?page=${page}&limit=20`);
      const results: CustomerList[] = data.data || [];

      setCustomers((prev) => {
        const existingIds = new Set(prev.map((c) => c.id));
        const unique = results.filter((c) => !existingIds.has(c.id));
        return [...prev, ...unique];
      });
      setTotalCustomers(data.total || 0);
      setPage((prev) => prev + 1);
      setHasMore(data.page < data.total_pages);
    } catch (err) {
      toast.error("Failed to load customers");
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }, [page, loading, hasMore, failed]);

  useEffect(() => {
    fetchCustomers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ✅ Create
  const handleCreate = () => {
    setSelectedCustomer(null);
    setFormOpen(true);
  };

  // ✅ Edit
  const handleEdit = (customer: CustomerList) => {
    setSelectedCustomer(customer);
    setFormOpen(true);
  };

  // ✅ Delete
  const handleDelete = (customer: CustomerList) => {
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

  // ✅ Handle form success
  const handleFormSuccess = (customer: CustomerList, isEdit: boolean) => {
    if (isEdit) {
      setCustomers((prev) =>
        prev.map((c) => (c.id === customer.id ? customer : c))
      );
    } else {
      setCustomers((prev) => [customer, ...prev]);
    }
    setFormOpen(false);
  };

  const columns: Column<CustomerList>[] = [
    {
      key: "sn",
      label: "S/N",
      render: (_row, index) => index + 1,
    },
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
    {
      key: "email",
      label: "Email",
      render: (row) => (
        <div className="flex flex-wrap gap-1">
          {Array.isArray(row.email) ? (
            row.email.map((e, i) => (
              <span
                key={i}
                className="bg-secondary/50 text-gray-800 px-2 py-0.5 rounded text-sm"
              >
                {e}
              </span>
            ))
          ) : (
            <span>{row.email}</span>
          )}
        </div>
      ),
    },
    { key: "web_address", label: "Web Address" },
    { key: "code", label: "Code" },
    {
      key: "actions",
      label: "Actions",
      render: (row) => (
        <div className="flex gap-2">
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
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-xl font-semibold">
          Customers <Badge variant="secondary">{totalCustomers}</Badge>
        </h1>
        <Button onClick={handleCreate}>Create Customer</Button>
      </div>

      <CommonTable
        columns={columns}
        data={customers}
        loading={loading}
        hasMore={hasMore}
        onLoadMore={fetchCustomers}
      />

      {/* ✅ Create/Edit Modal */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {selectedCustomer ? "Edit Customer" : "Create Customer"}
            </DialogTitle>
          </DialogHeader>
          <CustomerForm
            customer={selectedCustomer}
            onSuccess={handleFormSuccess}
            onCancel={() => setFormOpen(false)}
          />
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
