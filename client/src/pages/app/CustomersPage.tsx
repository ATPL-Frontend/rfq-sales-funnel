import { DeleteModal } from "@/components/modal/DeleteModal";
import { Modal } from "@/components/modal/Modal";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import type { CustomerList } from "@/types/index.ts";
import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Link } from "react-router-dom";
import type { Column } from "../../components/CommonTable";
import CommonTable from "../../components/CommonTable";
import api from "../../lib/api";
import CustomerForm from "./../../components/modal/CustomerModal";

export default function CustomersPage() {
  const [customers, setCustomers] = useState<CustomerList[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const [filters, setFilters] = useState({ q: "" });
  const [appliedFilters, setAppliedFilters] = useState(filters);
  const [totalCustomers, setTotalCustomers] = useState(0);

  // ✅ Fetch customers with infinite scroll
  const fetchCustomers = useCallback(async () => {
    console.log("Fetching customers with filters:", appliedFilters);
    if (loading || !hasMore || failed) return;

    setLoading(true);
    try {
      const { data } = await api.get(
        `/api/customers?page=${page}&limit=20&${new URLSearchParams(appliedFilters as any).toString()}`,
      );
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
  }, [page, loading, hasMore, failed, appliedFilters]);

  useEffect(() => {
    fetchCustomers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      setCustomers([]);
      setFailed(false);
      setHasMore(true);
      setPage(1);

      setAppliedFilters((prev) => ({
        ...prev,
        q: filters.q,
      }));
    }, 500);

    return () => clearTimeout(delayDebounce);
  }, [filters.q]);

  const confirmDelete = async (id: number | string) => {
    try {
      await api.delete(`/api/customers/${id}`);
      toast.success("Customer deleted successfully");
      setCustomers((prev) => prev.filter((c) => c.id !== id));
    } catch (err) {
      toast.error("Failed to delete customer");
    }
  };

  // ✅ Handle form success
  const handleFormSuccess = (customer: CustomerList, isEdit: boolean) => {
    if (isEdit) {
      setCustomers((prev) =>
        prev.map((c) => (c.id === customer.id ? customer : c)),
      );
    } else {
      setCustomers((prev) => [customer, ...prev]);
    }
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
      key: "currency",
      label: "Currency",
      render: (row) => <Badge variant="outline">{row.currency}</Badge>,
    },
    {
      key: "gst",
      label: "GST",
      render: (row) =>
        row.gst ? (
          <Badge variant="default">Included</Badge>
        ) : (
          <Badge variant="secondary">Excluded</Badge>
        ),
    },
    { key: "salesperson_name", label: "Salesperson" },
    {
      key: "actions",
      label: "Actions",
      render: (row) => (
        <div className="flex gap-2">
          <Modal title="Edit Customer" icon="edit" type="icon">
            {(closeModal) => (
              <CustomerForm
                key={row.id}
                customer={row}
                onSuccess={(savedCustomer, wasEdit) => {
                  handleFormSuccess(savedCustomer, wasEdit);
                  closeModal();
                }}
                onCancel={closeModal}
              />
            )}
          </Modal>
          <DeleteModal
            onDeleteItem={confirmDelete}
            actionLoading={loading}
            id={row.id}
            name={row.name}
            type="icon"
          />
        </div>
      ),
    },
  ];

  return (
    <div className="flex flex-col h-[calc(100vh-80px)]">
      <div className="flex justify-between items-center mb-4 gap-6">
        <h1 className="text-xl font-semibold">
          Customers <Badge variant="secondary">{totalCustomers}</Badge>
        </h1>

        <div className="flex flex-1 justify-end sm:w-auto items-center sm:gap-2 gap-1">
          {/* SEARCH (left of filter button) */}
          <Input
            className="w-full sm:max-w-72 md:max-w-60 lg:max-w-80 h-8"
            placeholder="Search name, email or code..."
            value={filters.q}
            onChange={(e) => setFilters({ ...filters, q: e.target.value })}
          />

          <Modal icon="userplus" label="Add Customer" title="Create Customer">
            {(closeModal) => (
              <CustomerForm
                key="create"
                customer={null}
                onSuccess={(savedCustomer, wasEdit) => {
                  handleFormSuccess(savedCustomer, wasEdit);
                  closeModal();
                }}
                onCancel={closeModal}
              />
            )}
          </Modal>
        </div>
      </div>

      <CommonTable
        columns={columns}
        data={customers}
        loading={loading}
        hasMore={hasMore}
        onLoadMore={fetchCustomers}
      />
    </div>
  );
}
