import InvoiceForm from "@/components/modal/InvoiceModal";
import { Edit, Eye, Trash2 } from "lucide-react";
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
  customer_name: string;
  customer_email: string;
  customer_code: string;
  amount: number;
  currency: string;
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

  // ✅ Fetch invoices with pagination
  const fetchInvoices = useCallback(async (pageNum = 1) => {
    setLoading(true);
    try {
      const { data } = await api.get(`/api/invoices?page=${pageNum}&limit=20`);
      const results: Invoice[] = data.data || [];

      setInvoices(results);
      setPage(data.page || pageNum);
      setTotalPages(data.total_pages || 1);
    } catch (err) {
      toast.error("Failed to load invoices");
    } finally {
      setLoading(false);
    }
  }, []);

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
    } catch (err) {
      toast.error("Failed to delete invoice");
    }
  };

  const columns: Column<Invoice>[] = [
    {
      key: "sn",
      label: "S/N",
      render: (_row, index) => (page - 1) * 20 + (index + 1),
    },
    {
      key: "invoice_date",
      label: "Date",
      render: (row) => dateHelper(row.invoice_date, OFFER_EXPIRED_DATE_FORMAT),
    },
    { key: "customer_name", label: "Customer" },
    { key: "customer_code", label: "Code" },
    {
      key: "amount",
      label: "Amount",
      render: (r) => `${r.amount} ${r.currency}`,
    },
    {
      key: "actions",
      label: "Actions",
      render: (row) => (
        <div className="flex gap-2">
          <Button
            onClick={() => navigate(`/app/invoices/${row.id}`)}
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

  // ✅ Handle Create/Update Success
  const handleFormSuccess = (invoice: Invoice, isEdit: boolean) => {
    if (isEdit) {
      setInvoices((prev) =>
        prev.map((i) =>
          Number(i.id) === Number(invoice.id) ? { ...i, ...invoice } : i
        )
      );
    } else {
      // After creating a new invoice, refetch page 1
      fetchInvoices(1);
    }
    setFormOpen(false);
  };

  return (
    <>
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-xl font-semibold">Invoices</h1>
        <Button onClick={handleCreate}>Create Invoice</Button>
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
        <DialogContent className="max-w-lg">
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
