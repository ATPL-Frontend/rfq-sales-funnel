import InvoiceFilter from "@/components/filter/InvoiceFilter";
import { DeleteModal } from "@/components/modal/DeleteModal";
import InvoiceForm from "@/components/modal/InvoiceModal";
import { Modal } from "@/components/modal/Modal";
import { Badge } from "@/components/ui/badge";
import { ArrowDownUp, Eye } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import type { Column } from "../../components/CommonTable";
import CommonTable from "../../components/CommonTable";
import api from "../../lib/api";
import { dateHelper, OFFER_EXPIRED_DATE_FORMAT } from "../../lib/dateHelper";

type Invoice = {
  id: number;
  invoice_date: string;
  create_invoice_date: string;
  customer_name: string;
  invoice_no: string;
  customer_id: number;
  customer_email: string;
  customer_code: string;
  amount: number;
  currency: string;
  gst: boolean;
  created_at: string;
  updated_at: string;
};

const normalizeInvoice = (invoice: any): Invoice => ({
  id: invoice.id,
  invoice_date: invoice.invoice_date,
  create_invoice_date: invoice.create_invoice_date,
  customer_id: invoice.customer_id,
  customer_name: invoice.customer_name,
  customer_email: invoice.customer_email,
  invoice_no: invoice.invoice_no,
  customer_code: invoice.customer_code,
  amount: invoice.amount,
  currency: invoice.currency,
  gst: invoice.gst,
  created_at: invoice.created_at,
  updated_at: invoice.updated_at,
});

export default function InvoicesPage() {
  const navigate = useNavigate();

  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);

  const [sortField, setSortField] = useState<string>("invoice_date");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  const [filters, setFilters] = useState({
    currency: "",
    date_filter_type: "invoice_date",
    date_from: "",
    date_to: "",
    amount_from: "",
    amount_to: "",
  });

  const [appliedFilters, setAppliedFilters] = useState(filters);

  const fetchInvoices = useCallback(async () => {
    if (loading || !hasMore || failed) return;

    setLoading(true);
    try {
      const { data } = await api.get("/api/invoices", {
        params: {
          page,
          limit: 20,
          ...(appliedFilters.date_filter_type === "invoice_date"
            ? {
                date_from: appliedFilters.date_from || undefined,
                date_to: appliedFilters.date_to || undefined,
              }
            : {
                create_date_from: appliedFilters.date_from || undefined,
                create_date_to: appliedFilters.date_to || undefined,
              }),
          amount_from: appliedFilters.amount_from || undefined,
          amount_to: appliedFilters.amount_to || undefined,
          currency: appliedFilters.currency || undefined,
          sort_field: sortField,
          sort_order: sortOrder,
        },
      });

      const results: Invoice[] = data.data || [];

      setInvoices((prev) => {
        const existingIds = new Set(prev.map((item) => item.id));
        const unique = results.filter((item) => !existingIds.has(item.id));
        return [...prev, ...unique];
      });

      setPage((prev) => prev + 1);
      setHasMore(data.page < data.total_pages);
    } catch (err) {
      toast.error("Failed to load invoices");
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }, [page, loading, hasMore, failed, appliedFilters, sortField, sortOrder]);

  useEffect(() => {
    fetchInvoices();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const confirmDelete = async (id: string | number) => {
    try {
      await api.delete(`/api/invoices/${id}`);
      toast.success("Invoice deleted successfully");
      setInvoices((prev) => prev.filter((item) => item.id !== id));
    } catch (err) {
      toast.error("Failed to delete invoice");
    }
  };

  const handleSort = (field: string) => {
    setInvoices([]);
    setFailed(false);
    setHasMore(true);
    setPage(1);

    if (sortField === field) {
      setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortOrder("desc");
    }
  };

  const handleFormSuccess = (
    savedInvoice: Invoice | Invoice[],
    isEdit: boolean,
  ) => {
    const invoice = Array.isArray(savedInvoice)
      ? savedInvoice[0]
      : savedInvoice;

    const normalizedInvoice = normalizeInvoice(invoice);

    if (isEdit) {
      setInvoices((prev) =>
        prev.map((item) =>
          Number(item.id) === Number(normalizedInvoice.id)
            ? normalizedInvoice
            : item,
        ),
      );
    } else {
      setInvoices((prev) => [normalizedInvoice, ...prev]);
    }
  };

  const columns: Column<Invoice>[] = [
    {
      key: "sn",
      label: "S/N",
      render: (_row, index) => index + 1,
    },
    {
      key: "invoice_date",
      label: (
        <span className="flex items-center gap-2">
          Sent Date
          <ArrowDownUp
            size={16}
            className="opacity-50 hover:opacity-100 cursor-pointer"
            onClick={() => handleSort("invoice_date")}
          />
        </span>
      ),
      render: (row) => dateHelper(row.invoice_date, OFFER_EXPIRED_DATE_FORMAT),
    },
    {
      key: "create_invoice_date",
      label: <span className="flex items-center gap-2">Created Date</span>,
      render: (row) =>
        dateHelper(row.create_invoice_date, OFFER_EXPIRED_DATE_FORMAT),
    },
    { key: "customer_name", label: "Customer" },
    { key: "invoice_no", label: "Invoice No." },
    { key: "customer_code", label: "Code" },
    {
      key: "amount",
      label: "Amount",
      align: "right",
      render: (r) => (
        <div className="text-right gap-1">
          {r.amount}{" "}
          <span
            className={`font-bold text-xs ${
              r.currency === "AUD" ? "text-primary" : "text-violet-600"
            }`}
          >
            {r.currency}
          </span>
        </div>
      ),
    },
    {
      key: "gst",
      label: "GST",
      render: (row) => (
        <Badge variant={row.gst ? "secondary" : "excluded"}>
          {row.gst ? "Included" : "Excluded"}
        </Badge>
      ),
    },
    {
      key: "actions",
      label: "Actions",
      render: (row) => (
        <div className="flex gap-3 items-center">
          <Eye
            onClick={() => navigate(`/app/invoices/${row.id}`)}
            className="text-blue-400 hover:text-blue-600 size-4 cursor-pointer"
          />

          <Modal title="Edit Invoice" icon="edit" type="icon" size="xl">
            {(closeModal) => (
              <InvoiceForm
                key={row.id}
                invoice={row}
                onSuccess={(savedInvoice, isEdit) => {
                  handleFormSuccess(savedInvoice, isEdit);
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
            name={row.invoice_no || `Invoice #${row.id}`}
            type="icon"
          />
        </div>
      ),
    },
  ];

  return (
    <>
      <div className="flex justify-between items-center mb-4 gap-6">
        <h1 className="text-xl font-semibold">Invoices</h1>

        <div className="flex gap-2 items-center">
          <Modal
            icon="filter"
            label="Filters"
            title="Invoice Filters"
            size="xl"
          >
            {(closeModal) => (
              <InvoiceFilter
                filters={filters}
                setFilters={setFilters}
                setAppliedFilters={(value) => {
                  setInvoices([]);
                  setFailed(false);
                  setHasMore(true);
                  setPage(1);
                  setAppliedFilters(value);
                  closeModal();
                }}
                setPage={setPage}
                closeModal={closeModal}
              />
            )}
          </Modal>

          <Modal
            icon="add"
            label="Create Invoice"
            title="Create Invoice"
            size="xl"
          >
            {(closeModal) => (
              <InvoiceForm
                key="create"
                invoice={null}
                onSuccess={(savedInvoice, isEdit) => {
                  handleFormSuccess(savedInvoice, isEdit);
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
        data={invoices}
        loading={loading}
        hasMore={hasMore}
        onLoadMore={fetchInvoices}
      />
    </>
  );
}
