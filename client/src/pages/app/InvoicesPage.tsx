import InvoiceForm from "@/components/modal/InvoiceModal";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { Check, ChevronsUpDown, Edit, Eye, Trash2 } from "lucide-react";
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
  invoice_no: string;
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

  const [customers, setCustomers] = useState<
    { id: number; name: string; email: string; code: string }[]
  >([]);
  const [loadingCustomers, setLoadingCustomers] = useState(false);
  const [customerOpen, setCustomerOpen] = useState(false);

  const [filters, setFilters] = useState({
    customer_id: "",
    invoice_no: "",
    date_from: "",
    date_to: "",
    amount_from: "",
    amount_to: "",
    currency: "",
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
            customer_id: appliedFilters.customer_id || undefined,
            invoice_no: appliedFilters.invoice_no || undefined,
            date_from: appliedFilters.date_from || undefined,
            date_to: appliedFilters.date_to || undefined,
            amount_from: appliedFilters.amount_from || undefined,
            amount_to: appliedFilters.amount_to || undefined,
            currency: appliedFilters.currency || undefined,
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
    [appliedFilters] // Only changes when APPLY FILTER is clicked
  );

  const fetchCustomers = async () => {
    if (customers.length > 0 || loadingCustomers) return;
    setLoadingCustomers(true);
    try {
      const { data } = await api.get("/api/customers?limit=100");
      setCustomers(data.data || []);
    } catch (err) {
      toast.error("Failed to load customers");
    } finally {
      setLoadingCustomers(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
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
    { key: "invoice_no", label: "Invoice No." },
    { key: "customer_code", label: "Code" },
    {
      key: "amount",
      label: "Amount",
      render: (r) => (
        <>
          {r.amount}{" "}
          <span
            className={`font-semibold text-sm ${
              r.currency === "AUD" ? "text-orange-600" : "text-green-600"
            }`}
          >
            {r.currency}
          </span>
        </>
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
      <div className="flex justify-between items-center mb-2">
        <h1 className="text-xl font-semibold">Invoices</h1>
        <Button onClick={handleCreate}>Create Invoice</Button>
      </div>

      <div className="p-4 mb-4 border border-primary border-dashed rounded grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <Popover open={customerOpen} onOpenChange={setCustomerOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              className={cn(
                "w-full justify-between overflow-hidden",
                !filters.customer_id && "text-muted-foreground"
              )}
            >
              <span className="truncate max-w-[90%]">
                {filters.customer_id
                  ? customers.find((c) => c.id === Number(filters.customer_id))
                      ?.name || "Select customer"
                  : "Select customer"}
              </span>

              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>

          <PopoverContent className="w-60 p-0 ml-6">
            <Command>
              <CommandInput placeholder="Search customer..." />

              <CommandList>
                <CommandEmpty>No customers found.</CommandEmpty>

                <CommandGroup>
                  {customers.map((c) => (
                    <CommandItem
                      key={c.id}
                      value={c.name}
                      onSelect={() => {
                        const clickedId = String(c.id);

                        setFilters((prev) => ({
                          ...prev,
                          customer_id:
                            prev.customer_id === clickedId ? "" : clickedId, // toggle here
                        }));

                        setCustomerOpen(false);
                      }}
                    >
                      <Check
                        className={cn(
                          "h-4 w-4",
                          String(c.id) === filters.customer_id
                            ? "opacity-100"
                            : "opacity-0"
                        )}
                      />

                      {c.name}
                      <span className="text-muted-foreground ml-1 text-xs">
                        (Code - {c.code})
                      </span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>

        <Input
          type="date"
          value={filters.date_from}
          onChange={(e) =>
            setFilters({ ...filters, date_from: e.target.value })
          }
        />

        <Input
          type="date"
          value={filters.date_to}
          onChange={(e) => setFilters({ ...filters, date_to: e.target.value })}
        />

        <Input
          type="text"
          placeholder="Invoice No"
          value={filters.invoice_no}
          onChange={(e) =>
            setFilters({ ...filters, invoice_no: e.target.value })
          }
        />

        <Select
          value={filters.currency}
          onValueChange={(value: string) =>
            setFilters({ ...filters, currency: value })
          }
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="$ Select currency" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="AUD">AUD</SelectItem>
            <SelectItem value="USD">USD</SelectItem>
          </SelectContent>
        </Select>

        <Input
          type="number"
          placeholder="Amount To"
          value={filters.amount_to}
          onChange={(e) =>
            setFilters({ ...filters, amount_to: e.target.value })
          }
        />

        <Input
          type="number"
          placeholder="Amount From"
          value={filters.amount_from}
          onChange={(e) =>
            setFilters({ ...filters, amount_from: e.target.value })
          }
        />

        <div className="flex items-center gap-2 col-span-2 md:col-span-3 lg:col-span-6">
          <Button
            variant="secondary"
            className="flex-1"
            onClick={() => {
              const empty = {
                customer_id: "",
                invoice_no: "",
                date_from: "",
                date_to: "",
                amount_from: "",
                amount_to: "",
                currency: "",
              };

              setFilters(empty);
              setAppliedFilters(empty); // reset active filters used by API
              setPage(1);
            }}
          >
            Clear Filters
          </Button>

          <Button
            onClick={() => {
              setAppliedFilters(filters); // Only now API will rerun because appliedFilters changes
              setPage(1);
            }}
            className="flex-1"
          >
            Apply Filters
          </Button>
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
