import Pagination from "@/components/Pagination";
import { Button } from "@/components/ui/button";
import api from "@/lib/api";
import { Edit, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";

import SearchSelectPopover from "@/components/SearchSelectPopover";
import type { Column } from "../../components/CommonTable";
import CommonTable from "../../components/CommonTable";

import RfqForm from "@/components/modal/RfqModal";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Customers, Rfq, SalesPerson, Users } from "@/types/index.ts";
import { dateHelper, OFFER_EXPIRED_DATE_FORMAT } from "../../lib/dateHelper";

export default function RfqPage() {
  const [rfqs, setRfqs] = useState<Rfq[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);

  const [selectedRfq, setSelectedRfq] = useState<Rfq | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  // ====================
  // FILTERS
  // ====================
  const [filters, setFilters] = useState({
    customer_id: "",
    receive_date: "",
    start_date: "",
    end_date: "",
    progress: "",
    currency: "",
  });
  const [appliedFilters, setAppliedFilters] = useState(filters);

  const [customers, setCustomers] = useState<Customers[]>([]);
  const [userList, setUserList] = useState<Users[]>([]);
  const [salesPerson, setSalesPerson] = useState<SalesPerson[] | null>(null);
  // const [salesPersonOpen, setSalesPersonOpen] = useState(false);

  const progressOptions = [
    "Waiting for Drawing",
    "Waiting for Customer's BOM",
    "Waiting for vendor quotation",
    "Waiting for Salesperson",
    "Waiting for Drawing Revision",
    "Salesperson will cover rest",
    "Partially Submitted",
    "Sent to Salesperson (100%)",
    "Sent to Customer (Done)",
  ];

  // ====================
  // FETCH RFQs
  // ====================
  const fetchRfqs = useCallback(
    async (pageNum = 1) => {
      setLoading(true);
      try {
        const { data } = await api.get("/api/rfqs", {
          params: {
            page: pageNum,
            limit: 20,
            customer_id: appliedFilters.customer_id || undefined,
            receive_date: appliedFilters.receive_date || undefined,
            start_date: appliedFilters.start_date || undefined,
            end_date: appliedFilters.end_date || undefined,
            progress: appliedFilters.progress || undefined,
            currency: appliedFilters.currency || undefined,
          },
        });

        setRfqs(
          (data.data || []).map((rfq: any) => ({
            ...rfq,
            prepared_by: rfq.prepared_by.map((u: any) => u.id), // convert objects → ids
          }))
        );
        setPage(data.page || pageNum);
        setTotalPages(data.total_pages || 1);
      } catch (err) {
        toast.error("Failed to load RFQs");
      } finally {
        setLoading(false);
      }
    },
    [appliedFilters]
  );

  const fetchCustomers = async () => {
    if (customers.length > 0) return;
    try {
      const { data } = await api.get("/api/customers?limit=200");
      setCustomers(data.data || []);
    } catch (err) {
      toast.error("Failed to load customers");
    }
  };

  const fetchUsers = async () => {
    if (userList.length > 0) return;
    try {
      const { data } = await api.get("/api/users?limit=200");
      const allUsers = data.data || [];

      // Filter only system users
      const systemUsers = allUsers.filter(
        (u: any) => u.user_type === "system_user"
      );

      setUserList(systemUsers);

      // filter only sales-persons
      const salesPersons = allUsers
      .filter(
        (u: any) => Array.isArray(u.roles) && u.roles.includes("sales-person")
      )
      .map((u: any) => ({
        id: String(u.id),
        name: u.name,
        short_form: u.short_form,
      }));

      // set state for salesperson dropdown/list
      setSalesPerson(salesPersons);
    } catch (err) {
      toast.error("Failed to load sales persons or users list");
    }
  };

  useEffect(() => {
    fetchCustomers();
    fetchUsers();
  }, []);

  useEffect(() => {
    fetchRfqs(page);
  }, [fetchRfqs, page]);

  // ====================
  // ACTIONS
  // ====================
  const handleCreate = () => {
    setSelectedRfq(null);
    setFormOpen(true);
  };

  const handleEdit = (rfq: Rfq) => {
    setSelectedRfq(rfq);
    setFormOpen(true);
  };

  const handleDelete = (rfq: Rfq) => {
    setSelectedRfq(rfq);
    setDeleteOpen(true);
  };

  const confirmDelete = async () => {
    if (!selectedRfq) return;
    try {
      await api.delete(`/api/rfqs/${selectedRfq.id}`);
      toast.success("RFQ deleted successfully");
      fetchRfqs(page);
      setDeleteOpen(false);
    } catch (err) {
      toast.error("Failed to delete RFQ");
    }
  };

  const handleFormSuccess = (rfq: any, isEdit: boolean) => {
    const normalized: Rfq = {
      ...rfq,
      prepared_by: rfq.prepared_by.map((p: any) => p.id), // convert objects → ids
    };

    if (isEdit) {
      setRfqs((prev) =>
        prev.map((r) => (r.id === normalized.id ? { ...r, ...normalized } : r))
      );
    } else {
      fetchRfqs(1);
    }

    setFormOpen(false);
  };

  // ====================
  // COLUMNS
  // ====================
  const columns: Column<Rfq>[] = [
    { key: "id", label: "ID" },
    {
      key: "receive_date",
      label: "Receive Date",
      render: (row) => dateHelper(row.receive_date, OFFER_EXPIRED_DATE_FORMAT),
    },
    {
      key: "start_date",
      label: "Start Date",
      render: (row) => dateHelper(row.start_date, OFFER_EXPIRED_DATE_FORMAT),
    },
    {
      key: "end_date",
      label: "End Date",
      render: (row) => dateHelper(row.end_date, OFFER_EXPIRED_DATE_FORMAT),
    },
    {
      key: "customer_id",
      label: "Customer",
      render: (row) =>
        customers.find((c) => c.id === row.customer_id)?.name ||
        row.customer_id,
    },
    { key: "quantity", label: "Qty" },
    { key: "price", label: "Price" },
    { key: "currency", label: "Currency" },
    { key: "work_type", label: "Work Type" },
    {
      key: "prepared_by",
      label: "Prepared By",
      render: (row) => {
        const names = userList
          .filter((u) => row.prepared_by.includes(u.id))
          .map((u) => u.short_form || u.name);

        return names.join(", ");
      },
    },
    { key: "progress", label: "Progress" },
    { key: "rfq_location", label: "Location" },
    { key: "remarks", label: "Remarks" },
    {
      key: "actions",
      label: "Actions",
      render: (row) => (
        <div className="flex gap-2">
          <Button onClick={() => handleEdit(row)} size="sm">
            <Edit className="w-4 h-4" />
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => handleDelete(row)}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      ),
    },
  ];

  // ====================
  // RENDER
  // ====================
  return (
    <section className="space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-xl font-semibold">RFQ</h1>
        <Button onClick={handleCreate}>Create RFQ</Button>
      </div>

      {/* ============================
            FILTER PANEL (MATCHES INVOICES)
      ============================ */}
      <div className="p-4 mb-4 border border-primary border-dashed rounded grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* CUSTOMER FILTER */}
        <SearchSelectPopover
          label="Customer"
          options={customers}
          value={filters.customer_id}
          onChange={(val) =>
            setFilters((prev) => ({ ...prev, customer_id: String(val) }))
          }
          multiple={false}
          placeholder="Select customer"
        />

        <div className="col-span-1">
          <label className="block text-sm text-gray-600 mb-1">
            Received Date
          </label>
          {/* DATE FILTERS */}
          <Input
            type="date"
            value={filters.receive_date}
            onChange={(e) =>
              setFilters({ ...filters, receive_date: e.target.value })
            }
          />
        </div>

        <div className="col-span-1">
          <label className="block text-sm text-gray-600 mb-1">Start Date</label>
          <Input
            type="date"
            value={filters.start_date}
            onChange={(e) =>
              setFilters({ ...filters, start_date: e.target.value })
            }
          />
        </div>

        <div className="col-span-1">
          <label className="block text-sm text-gray-600 mb-1">End Date</label>
          <Input
            type="date"
            value={filters.end_date}
            onChange={(e) =>
              setFilters({ ...filters, end_date: e.target.value })
            }
          />
        </div>

        <div className="col-span-1">
          <label className="block text-sm text-gray-600 mb-1">Status</label>
          {/* PROGRESS */}
          <Select
            value={filters.progress}
            onValueChange={(value) =>
              setFilters((prev) => ({ ...prev, progress: value }))
            }
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Progress" />
            </SelectTrigger>
            <SelectContent>
              {progressOptions.map((opt) => (
                <SelectItem value={opt} key={opt}>
                  {opt}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="col-span-1">
          <label className="block text-sm text-gray-600 mb-1">Currency</label>
          {/* CURRENCY */}
          <Select
            value={filters.currency}
            onValueChange={(value) =>
              setFilters((prev) => ({ ...prev, currency: value }))
            }
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Currency" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="AUD">AUD</SelectItem>
              <SelectItem value="USD">USD</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* APPLY / CLEAR */}
        <div className="col-span-2 md:col-span-3 lg:col-span-6 flex gap-2">
          <Button
            variant="secondary"
            className="flex-1"
            onClick={() => {
              const empty = {
                customer_id: "",
                receive_date: "",
                start_date: "",
                end_date: "",
                progress: "",
                currency: "",
              };
              setFilters(empty);
              setAppliedFilters(empty);
              setPage(1);
            }}
          >
            Clear Filters
          </Button>

          <Button
            className="flex-1"
            onClick={() => {
              setAppliedFilters(filters);
              setPage(1);
            }}
          >
            Apply Filters
          </Button>
        </div>
      </div>

      {/* TABLE */}
      <CommonTable columns={columns} data={rfqs} loading={loading} />

      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />

      {/* CREATE/EDIT DIALOG */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedRfq ? "Edit RFQ" : "Create RFQ"}</DialogTitle>
          </DialogHeader>
          <RfqForm
            rfq={selectedRfq}
            salesPerson={salesPerson}
            userList={userList}
            onSuccess={handleFormSuccess}
            onCancel={() => setFormOpen(false)}
          />
        </DialogContent>
      </Dialog>

      {/* DELETE CONFIRM */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete RFQ</DialogTitle>
          </DialogHeader>
          <p className="text-muted-foreground">
            Are you sure you want to delete RFQ{" "}
            <span className="font-semibold">#{selectedRfq?.id}</span>?
          </p>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setDeleteOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
