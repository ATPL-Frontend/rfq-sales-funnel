import { DcaPreview } from "@/components/DcaPreview";
import RfqFilter from "@/components/filter/RfqFilter";
import { DeleteModal } from "@/components/modal/DeleteModal";
import { Modal } from "@/components/modal/Modal";
import RfqForm from "@/components/modal/RfqModal";
import { Progress } from "@/components/Progress";
import SearchBar from "@/components/SearchBar";
import { TruncateTextCell } from "@/components/TruncateTextCell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import api from "@/lib/api";
import { formatDateDDMMYYYY } from "@/lib/dateHelper";
import type { Rfq, SalesPerson, Users } from "@/types/index.ts";
import { CircleCheckBig, RotateCcw, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import type { Column } from "../../components/CommonTable";
import CommonTable from "../../components/CommonTable";

type RfqFilterValues = {
  customer_id: string;
  receive_date: string;
  start_date: string;
  end_date: string;
  progress_type: "" | "done" | "percentage";
  currency: string;
  content: string;
  prepared_by_id: string;
  salesperson_id: string;
};

const initialFilters: RfqFilterValues = {
  customer_id: "",
  receive_date: "",
  start_date: "",
  end_date: "",
  progress_type: "",
  currency: "",
  content: "",
  prepared_by_id: "",
  salesperson_id: "",
};

export default function RfqPage() {
  const [rfqs, setRfqs] = useState<Rfq[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRfqs, setTotalRfqs] = useState(0);
  const [loading, setLoading] = useState(false);
  const loadMoreLockRef = useRef(false);

  const [filters, setFilters] = useState<RfqFilterValues>(initialFilters);
  const [appliedFilters, setAppliedFilters] =
    useState<RfqFilterValues>(initialFilters);

  const [apiSearch, setApiSearch] = useState("");
  const [debouncedApiSearch, setDebouncedApiSearch] = useState("");

  const [userList, setUserList] = useState<Users[]>([]);
  const [salesPerson, setSalesPerson] = useState<SalesPerson[] | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const hasAppliedFilters = Object.values(appliedFilters).some(
    (value) => value !== "",
  );

  const clearAllFilters = () => {
    loadMoreLockRef.current = false;

    setFilters(initialFilters);
    setAppliedFilters(initialFilters);
    setPage(1);
  };

  const clearSingleFilter = (key: keyof RfqFilterValues) => {
    const updatedFilters = {
      ...appliedFilters,
      [key]: "",
    };

    loadMoreLockRef.current = false;

    setFilters((prev) => ({
      ...prev,
      [key]: "",
    }));

    setAppliedFilters(updatedFilters);
    setPage(1);
  };

  const filterLabels: Record<keyof RfqFilterValues, string> = {
    customer_id: "Customer",
    receive_date: "Receive Date",
    start_date: "Start Date",
    end_date: "End Date",
    progress_type: "Progress",
    currency: "Currency",
    content: "Content",
    prepared_by_id: "Prepared By",
    salesperson_id: "Salesperson",
  };

  const formatFilterValue = (key: keyof RfqFilterValues, value: string) => {
    if (key === "progress_type") {
      if (value === "done") return "Done";
      if (value === "percentage") return "Percentage";
    }

    if (key === "prepared_by_id") {
      const user = userList.find((item) => String(item.id) === String(value));
      return user?.name || value;
    }

    if (key === "salesperson_id") {
      const user = salesPerson?.find(
        (item) => String(item.id) === String(value),
      );
      return user?.name || value;
    }

    return value;
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedApiSearch((prev) => {
        if (prev === apiSearch) {
          return prev;
        }

        return apiSearch;
      });

      setPage(1);
      loadMoreLockRef.current = false;
    }, 400);

    return () => clearTimeout(timer);
  }, [apiSearch]);

  const fetchRfqs = useCallback(
    async (pageNum = 1) => {
      setLoading(true);

      try {
        const { data } = await api.get("/api/rfqs", {
          params: {
            page: pageNum,
            limit: 20,
            q: debouncedApiSearch || undefined,
            customer_id: appliedFilters.customer_id || undefined,
            receive_date: appliedFilters.receive_date || undefined,
            start_date: appliedFilters.start_date || undefined,
            end_date: appliedFilters.end_date || undefined,
            progress_type: appliedFilters.progress_type || undefined,
            currency: appliedFilters.currency || undefined,
            content: appliedFilters.content || undefined,
            prepared_by_id: appliedFilters.prepared_by_id || undefined,
            salesperson_id: appliedFilters.salesperson_id || undefined,
          },
        });

        const newRfqs: Rfq[] = data.data || [];

        setRfqs((prev) => {
          if (pageNum === 1) {
            return newRfqs;
          }

          const existingIds = new Set(prev.map((rfq) => rfq.id));

          const uniqueNewRfqs = newRfqs.filter(
            (rfq) => !existingIds.has(rfq.id),
          );

          return [...prev, ...uniqueNewRfqs];
        });

        setTotalPages(data.total_pages || 1);
        setTotalRfqs(data.total || 0);
      } catch {
        toast.error("Failed to load RFQs");
      } finally {
        setLoading(false);
        loadMoreLockRef.current = false;
      }
    },
    [appliedFilters, debouncedApiSearch],
  );

  const fetchUsers = async () => {
    if (userList.length > 0) return;

    try {
      const { data } = await api.get("/api/users?limit=200");
      const allUsers = data.data || [];

      // const systemUsers = allUsers.filter(
      //   (u: any) => u.user_type === "system_user",
      // );
      // setUserList(systemUsers);
      setUserList(allUsers);

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

      setSalesPerson(salesPersons);
    } catch {
      toast.error("Failed to load sales persons or users list");
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    fetchRfqs(page);
  }, [fetchRfqs, page]);

  const handleLoadMore = useCallback(() => {
    if (loading) {
      return;
    }

    if (loadMoreLockRef.current) {
      return;
    }

    if (page >= totalPages) {
      return;
    }

    loadMoreLockRef.current = true;

    setPage((currentPage) => {
      if (currentPage >= totalPages) {
        loadMoreLockRef.current = false;
        return currentPage;
      }

      return currentPage + 1;
    });
  }, [loading, page, totalPages]);

  const confirmDelete = async (id: string | number) => {
    setDeleteLoading(true);

    try {
      await api.delete(`/api/rfqs/${id}`);

      setRfqs((prev) => prev.filter((rfq) => rfq.id !== id));

      setTotalRfqs((prev) => Math.max(prev - 1, 0));

      toast.success("RFQ deleted successfully");
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
    };

    if (isEdit) {
      setRfqs((prev) =>
        prev.map((r) => (r.id === normalized.id ? { ...r, ...normalized } : r)),
      );

      return;
    }

    loadMoreLockRef.current = false;

    if (page === 1) {
      fetchRfqs(1);
    } else {
      setPage(1);
    }
  };

  const columns: Column<Rfq>[] = [
    // { key: "id", label: "ID" },
    {
      key: "receive_date",
      label: "Receive Date",
      render: (row) => formatDateDDMMYYYY(row.receive_date),
    },
    {
      key: "start_date",
      label: "Start Date",
      render: (row) => formatDateDDMMYYYY(row.start_date),
    },
    {
      key: "end_date",
      label: "End Date",
      render: (row) => (row.end_date ? formatDateDDMMYYYY(row.end_date) : "-"),
    },
    {
      key: "customer_name",
      label: "Customer",
      render: (row: any) => (
        <TruncateTextCell
          value={row.customer_name || row.customer_id}
          className="w-30"
        />
      ),
    },
    { key: "quantity", label: "Qty", align: "right" },
    {
      key: "amount",
      label: "Price",
      align: "right",
      render: (row: any) => (
        <div className="text-right">
          {row.price}
          <span
            className={`font-bold text-xs ml-1 ${
              row.currency === "AUD" ? "text-primary" : "text-violet-600"
            }`}
          >
            {row.currency}
          </span>
        </div>
      ),
    },
    // { key: "price", label: "Price", align: "right" },
    // { key: "currency", label: "Currency" },
    { key: "work_type", label: "Work Type" },
    {
      key: "prepared_by",
      label: "Prepared By",
      align: "center",
      render: (row: any) => {
        const names = Array.isArray(row.prepared_by)
          ? row.prepared_by.map((u: any) => u.short_form || u.name)
          : [];

        return names.length ? names.join(", ") : "-";
      },
    },
    {
      key: "salesperson",
      label: "Salesperson",
      align: "center",
      render: (row: any) => (
        <TruncateTextCell
          value={row.salesperson?.short_form || row.salesperson?.name}
          toolTipText={row.salesperson?.name}
          className="w-22"
        />
      ),
    },
    {
      key: "progress",
      label: "Progress",
      align: "center",
      render: (row) => {
        const value = String(row.progress ?? "").trim();
        const isDone = value === "Done";
        const percent = Number(value);
        const isPercent =
          value !== "" &&
          !Number.isNaN(percent) &&
          percent >= 0 &&
          percent <= 100;

        if (isDone) {
          return (
            <Badge variant="secondary" className="px-2 w-20 gap-2">
              <CircleCheckBig className="h-4 w-4" />
              Done
            </Badge>
          );
        }

        if (isPercent) {
          return <Progress percent={percent} />;
        }

        return <span>{value || "-"}</span>;
      },
    },
    {
      key: "rfq_location",
      label: "Location",
      render: (row) => (
        <TruncateTextCell
          value={row.rfq_location}
          copyable
          copySuccessMessage="Location copied"
          className="min-w-25 max-w-30 justify-between"
        />
      ),
    },
    {
      key: "remarks",
      label: "Remarks",
      render: (row: any) => (
        <TruncateTextCell value={row.remarks} className="w-30" />
      ),
    },
    {
      key: "contents",
      label: "DCA / Content",
      render: (row: any) => <DcaPreview contents={row.contents} />,
    },
    {
      key: "actions",
      label: "Actions",
      render: (row) => (
        <div className="flex gap-3 items-center justify-center">
          <Modal title="Edit RFQ" icon="edit" type="icon" size="lg">
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

  return (
    <section className="space-y-4">
      <div className="flex justify-between items-center gap-6">
        <h1 className="text-xl font-semibold">
          RFQ <Badge variant="secondary">{totalRfqs}</Badge>
        </h1>

        <div className="flex flex-1 justify-end sm:w-auto items-center sm:gap-2 gap-1">
          <SearchBar
            searchTerm={apiSearch}
            onSearchChange={setApiSearch}
            searchPlaceholder="Search Customer, DCA..."
          />

          <Modal icon="filter" label="Filters" title="RFQ Filters" size="xl">
            {(closeModal) => (
              <RfqFilter
                filters={filters}
                setFilters={setFilters}
                setAppliedFilters={(value) => {
                  loadMoreLockRef.current = false;
                  setAppliedFilters(value);
                  setPage(1);
                }}
                setPage={setPage}
                closeModal={closeModal}
              />
            )}
          </Modal>

          <Modal icon="add" label="Create RFQ" title="Create RFQ" size="lg">
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
          {/* </SearchBar> */}
        </div>
      </div>

      {hasAppliedFilters && (
        <div className="rounded-lg border bg-card px-3 py-2.5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="mr-1 text-xs font-medium text-muted-foreground">
              Applied filters
            </span>

            {Object.entries(appliedFilters).map(([key, value]) => {
              if (!value) return null;

              const filterKey = key as keyof RfqFilterValues;

              return (
                <div
                  key={key}
                  className="group inline-flex h-7 items-center gap-1.5 rounded-md border bg-secondary px-2.5 text-xs font-medium text-secondary-foreground transition-colors hover:bg-accent"
                >
                  <span className="text-muted-foreground">
                    {filterLabels[filterKey]}:
                  </span>

                  <span className="max-w-40 truncate">
                    {formatFilterValue(filterKey, value)}
                  </span>

                  <button
                    type="button"
                    onClick={() => clearSingleFilter(filterKey)}
                    className="ml-0.5 inline-flex size-4 items-center justify-center rounded-sm text-muted-foreground transition-colors hover:bg-background hover:text-foreground"
                    aria-label={`Clear ${filterLabels[filterKey]} filter`}
                  >
                    <X className="size-3" />
                  </button>
                </div>
              );
            })}

            <Button
              onClick={clearAllFilters}
              size="sm"
              className="ml-auto"
              variant="destructive"
            >
              <RotateCcw className="size-3.5" />
              Clear all
            </Button>
          </div>
        </div>
      )}

      <CommonTable
        columns={columns}
        data={rfqs}
        loading={loading}
        hasMore={page < totalPages}
        onLoadMore={handleLoadMore}
      />
    </section>
  );
}
