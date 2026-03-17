import InvoiceFilter from "@/components/filter/InvoiceFilter";
import InvoiceForm from "@/components/modal/InvoiceModal";
import { Modal } from "@/components/modal/Modal";
import { Badge } from "@/components/ui/badge";
import { ArrowDownUp, Eye } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import type { Column } from "../../components/CommonTable";
import CommonTable from "../../components/CommonTable";
import Pagination from "../../components/Pagination";
import api from "../../lib/api";
import { dateHelper, OFFER_EXPIRED_DATE_FORMAT } from "../../lib/dateHelper";
import { DeleteModal } from "@/components/modal/DeleteModal";

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
};

export default function InvoicesPage() {
  const navigate = useNavigate();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
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

  // ✅ Fetch invoices with pagination
  const fetchInvoices = useCallback(
    async (pageNum = 1) => {
      setLoading(true);
      try {
        const { data } = await api.get("/api/invoices", {
          params: {
            page: pageNum,
            limit: 20,
            // customer_id: appliedFilters.customer_id || undefined,
            // invoice_no: appliedFilters.invoice_no || undefined,
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

        setInvoices(data.data || []);
        setPage(data.page || pageNum);
        setTotalPages(data.total_pages || 1);
      } catch {
        toast.error("Failed to load invoices");
      } finally {
        setLoading(false);
      }
    },
    [appliedFilters, sortField, sortOrder], // Only changes when these change
  );

  useEffect(() => {
    fetchInvoices(page);
  }, [fetchInvoices, page]);

  const confirmDelete = async (id: string | number) => {
    try {
      await api.delete(`/api/invoices/${id}`);
      toast.success("Invoice deleted successfully");
      fetchInvoices(page);
    } catch (err) {
      toast.error("Failed to delete invoice");
      throw err;
    }
  };

  const handleSort = (field: string) => {
    setSortField(field);
    setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
    setPage(1); // Reset to first page when sorting
  };

  const columns: Column<Invoice>[] = [
    {
      key: "sn",
      label: "S/N",
      render: (_row, index) => (page - 1) * 20 + (index + 1),
    },
    {
      key: "invoice_date",
      label: (
        <span className="flex items-center gap-2">
          Sent Date{" "}
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
      label: (
        <span className="flex items-center gap-2">
          Created Date{" "}
          {/* <ArrowDownUp
            size={16}
            className="opacity-50 hover:opacity-100 cursor-pointer"
            onClick={() => handleSort("create_invoice_date")}
          /> */}
        </span>
      ),
      render: (row) =>
        dateHelper(row.create_invoice_date, OFFER_EXPIRED_DATE_FORMAT),
    },
    { key: "customer_name", label: "Customer" },
    { key: "invoice_no", label: "Invoice No." },
    { key: "customer_code", label: "Code" },
    {
      key: "amount",
      label: (
        <span className="flex items-center gap-2">
          Amount
          {/* <ArrowDownUp
            size={16}
            className="opacity-50 hover:opacity-100 cursor-pointer"
            onClick={() => handleSort("amount")}
          /> */}
        </span>
      ),
      render: (r) => (
        <>
          {r.amount}{" "}
          <span
            className={`font-semibold text-sm ${
              r.currency === "AUD" ? "text-primary" : "text-violet-600"
            }`}
          >
            {r.currency}
          </span>
        </>
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

          <Modal title="Edit Invoice" icon="edit" type="icon" size="md">
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

  // ✅ Handle Create/Update Success
  const handleFormSuccess = (invoice: Invoice, isEdit: boolean) => {
    if (isEdit) {
      setInvoices((prev) =>
        prev.map((i) =>
          Number(i.id) === Number(invoice.id) ? { ...i, ...invoice } : i,
        ),
      );
    } else {
      fetchInvoices(1);
      setPage(1);
    }
  };

  return (
    <>
      <div className="flex justify-between items-center mb-4 gap-6">
        <h1 className="text-xl font-semibold">Invoices</h1>

        <div className="flex gap-2 items-center">
          <Modal icon="filter" label="Filters" title="Invoice Filters">
            {(closeModal) => (
              <InvoiceFilter
                filters={filters}
                setFilters={setFilters}
                setAppliedFilters={setAppliedFilters}
                setPage={setPage}
                closeModal={closeModal}
              />
            )}
          </Modal>

          <Modal
            icon="add"
            label="Create Invoice"
            title="Create Invoice"
            size="md"
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

      <CommonTable columns={columns} data={invoices} loading={loading} />

      {/* ✅ Pagination below table */}
      <Pagination
        page={page}
        totalPages={totalPages}
        onPageChange={(newPage) => setPage(newPage)}
      />
    </>
  );
}
