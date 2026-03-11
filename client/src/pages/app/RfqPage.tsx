import RfqFilter from "@/components/filter/RfqFilter";
import { DeleteModal } from "@/components/modal/DeleteModal";
import { Modal } from "@/components/modal/Modal";
import RfqForm from "@/components/modal/RfqModal";
import Pagination from "@/components/Pagination";
import api from "@/lib/api";
import type { Rfq, SalesPerson, Users } from "@/types/index.ts";
import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import type { Column } from "../../components/CommonTable";
import CommonTable from "../../components/CommonTable";
import { dateHelper, OFFER_EXPIRED_DATE_FORMAT } from "../../lib/dateHelper";

export default function RfqPage() {
  const [rfqs, setRfqs] = useState<Rfq[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);

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
    content: "",
  });
  const [appliedFilters, setAppliedFilters] = useState(filters);

  // const [customers, setCustomers] = useState<Customers[]>([]);
  const [userList, setUserList] = useState<Users[]>([]);
  const [salesPerson, setSalesPerson] = useState<SalesPerson[] | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

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
            content: appliedFilters.content || undefined,
          },
        });

        setRfqs(
          (data.data || []).map((rfq: any) => ({
            ...rfq,
            // prepared_by: rfq.prepared_by.map((u: any) => u.id), // convert objects → ids
            prepared_by: Array.isArray(rfq.prepared_by)
              ? rfq.prepared_by.map((u: any) => u.id)
              : [],
          })),
        );
        setPage(data.page || pageNum);
        setTotalPages(data.total_pages || 1);
      } catch (err) {
        toast.error("Failed to load RFQs");
      } finally {
        setLoading(false);
      }
    },
    [appliedFilters],
  );

  // const fetchCustomers = async () => {
  //   if (customers.length > 0) return;
  //   try {
  //     const { data } = await api.get("/api/customers?limit=200");
  //     setCustomers(data.data || []);
  //   } catch (err) {
  //     toast.error("Failed to load customers");
  //   }
  // };

  const fetchUsers = async () => {
    if (userList.length > 0) return;
    try {
      const { data } = await api.get("/api/users?limit=200");
      const allUsers = data.data || [];

      // Filter only system users
      const systemUsers = allUsers.filter(
        (u: any) => u.user_type === "system_user",
      );

      setUserList(systemUsers);

      // filter only sales-persons
      const salesPersons = allUsers
        .filter(
          (u: any) =>
            Array.isArray(u.roles) && u.roles.includes("sales-person"),
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
    // fetchCustomers();
    fetchUsers();
  }, []);

  useEffect(() => {
    fetchRfqs(page);
  }, [fetchRfqs, page]);

  // ====================
  // ACTIONS
  // ====================
  const confirmDelete = async (id: string | number) => {
    setDeleteLoading(true);
    try {
      await api.delete(`/api/rfqs/${id}`);
      toast.success("RFQ deleted successfully");
      fetchRfqs(page);
    } catch (err) {
      toast.error("Failed to delete RFQ");
      throw err;
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleFormSuccess = (rfq: any, isEdit: boolean) => {
    const normalized: Rfq = {
      ...rfq,
      // prepared_by: rfq.prepared_by.map((p: any) => p.id),
      prepared_by: Array.isArray(rfq.prepared_by)
        ? rfq.prepared_by.map((p: any) => p.id)
        : [],
    };

    if (isEdit) {
      setRfqs((prev) =>
        prev.map((r) => (r.id === normalized.id ? { ...r, ...normalized } : r)),
      );
    } else {
      fetchRfqs(1);
      setPage(1);
    }
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
      key: "customer_name",
      label: "Customer",
      render: (row: any) => row.customer_name || row.customer_id,
    },
    // {
    //   key: "customer_id",
    //   label: "Customer",
    //   render: (row) =>
    //     customers.find((c) => c.id === row.customer_id)?.name ||
    //     row.customer_id,
    // },
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
      key: "contents",
      label: "DCA / Content",
      render: (row: any) =>
        Array.isArray(row.contents) && row.contents.length
          ? row.contents.join(", ")
          : "-",
    },
    {
      key: "actions",
      label: "Actions",
      render: (row) => (
        <div className="flex gap-3 items-center">
          <Modal title="Edit RFQ" icon="edit" type="icon" size="md">
            {(closeModal) => (
              <RfqForm
                key={row.id}
                rfq={row}
                salesPerson={salesPerson}
                userList={userList}
                onSuccess={(savedRfq, isEdit) => {
                  handleFormSuccess(savedRfq, isEdit);
                  closeModal();
                }}
                onCancel={closeModal}
              />
            )}
          </Modal>

          <DeleteModal
            onDeleteItem={confirmDelete}
            actionLoading={deleteLoading}
            id={row.id}
            name={`RFQ #${row.id}`}
            type="icon"
          />
        </div>
      ),
    },
  ];

  // ====================
  // RENDER
  // ====================
  return (
    <section className="space-y-4">
      <div className="flex justify-between items-center gap-6">
        <h1 className="text-xl font-semibold">RFQ</h1>
        <div className="flex flex-1 justify-end sm:w-auto items-center sm:gap-2 gap-1">
          {/* SEARCH (left of filter button) */}
          {/* <Input
            className="w-full sm:max-w-72 md:max-w-60 lg:max-w-80 h-8"
            placeholder="Search name, email or code..."
            value={filters.q}
            onChange={(e) => setFilters({ ...filters, q: e.target.value })}
          /> */}

          <Modal icon="filter" label="Filters" title="RFQ Filters" size="lg">
            {(closeModal) => (
              <RfqFilter
                filters={filters}
                setFilters={setFilters}
                setAppliedFilters={setAppliedFilters}
                setPage={setPage}
                closeModal={closeModal}
                // customers={customers}
              />
            )}
          </Modal>

          <Modal icon="add" label="Create RFQ" title="Create RFQ" size="md">
            {(closeModal) => (
              <RfqForm
                key="create-rfq"
                rfq={null}
                salesPerson={salesPerson}
                userList={userList}
                onSuccess={(savedRfq, isEdit) => {
                  handleFormSuccess(savedRfq, isEdit);
                  closeModal();
                }}
                onCancel={closeModal}
              />
            )}
          </Modal>
        </div>
      </div>

      <CommonTable columns={columns} data={rfqs} loading={loading} />

      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
    </section>
  );
}
