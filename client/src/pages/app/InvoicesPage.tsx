import InvoiceFilter from "@/components/filter/InvoiceFilter";
import InvoiceForm from "@/components/modal/InvoiceModal";
import { Modal } from "@/components/modal/Modal";
import { Badge } from "@/components/ui/badge";
import {
  ArrowDownUp,
  Edit,
  Eye,
  Trash2,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import type { Column } from "../../components/CommonTable";
import CommonTable from "../../components/CommonTable";
import Pagination from "../../components/Pagination";
import { Button } from "../../components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../components/ui/dialog";
import api from "../../lib/api";
import { dateHelper, OFFER_EXPIRED_DATE_FORMAT } from "../../lib/dateHelper";

type Invoice = {
  id: number;
  invoice_date: string;
  create_invoice_date: string;
  customer_name: string;
  invoice_no: string;
  customer_email: string;
  customer_code: string;
  amount: number;
  currency: string;
  gst: boolean;
  created_at: string;
};

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);

  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const navigate = useNavigate();
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

  // ✅ Create New Invoice
  const handleCreate = () => {
    setSelectedInvoice(null);
    setFormOpen(true);
  };

  // ✅ Edit Invoice
  const handleEdit = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setFormOpen(true);
  };

  // ✅ Delete Invoice
  const handleDelete = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setDeleteOpen(true);
  };

  const confirmDelete = async () => {
    if (!selectedInvoice) return;
    try {
      await api.delete(`/api/invoices/${selectedInvoice.id}`);
      toast.success("Invoice deleted successfully");
      // Refresh current page
      fetchInvoices(page);
      setDeleteOpen(false);
      setSelectedInvoice(null);
    } catch (err) {
      toast.error("Failed to delete invoice");
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
        <div className="flex gap-2">
          <Button
            onClick={() => navigate(`/app/invoices/${row.id}`)}
            variant="secondary"
            size="sm"
          >
            <Eye className="w-4 h-4" />
          </Button>
          <Button onClick={() => handleEdit(row)} variant="default" size="sm">
            <Edit className="w-4 h-4" />
          </Button>
          <Button
            onClick={() => handleDelete(row)}
            variant="destructive"
            size="sm"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
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
      // After creating a new invoice, refetch page 1
      fetchInvoices(1);
    }
    setFormOpen(false);
  };

  return (
    <>
      <div className="flex justify-between items-center mb-4 gap-6">
        <h1 className="text-xl font-semibold">Invoices</h1>

        <div className="flex gap-2 items-center">
          <Modal
            icon="filter"
            label="Filters"
            title="Invoice Filters"
          >
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

          <Button size="sm" onClick={handleCreate}>Create Invoice</Button>
        </div>
      </div>

      <CommonTable columns={columns} data={invoices} loading={loading} />

      {/* ✅ Pagination below table */}
      <Pagination
        page={page}
        totalPages={totalPages}
        onPageChange={(newPage) => setPage(newPage)}
      />

      {/* ✅ Create/Edit Form */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedInvoice ? "Edit Invoice" : "Create Invoice"}
            </DialogTitle>
          </DialogHeader>
          <InvoiceForm
            invoice={selectedInvoice}
            onSuccess={handleFormSuccess}
            onCancel={() => setFormOpen(false)}
          />
        </DialogContent>
      </Dialog>

      {/* ✅ Delete Confirmation */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Invoice</DialogTitle>
          </DialogHeader>
          <p className="text-muted-foreground">
            Are you sure you want to delete invoice #
            <span className="font-semibold">{selectedInvoice?.id}</span>?
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
