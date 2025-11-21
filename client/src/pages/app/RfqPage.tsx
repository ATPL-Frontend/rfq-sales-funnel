import { useState } from "react";
import { useNavigate } from "react-router-dom";

type Rfq = {
  id: number;
  receive_date: string;
  start_date: string;
  customer_id: number;
  salesperson_id: number;
  quantity: number;
  price: number;
  currency: string;
  prepared_by: number[];
  end_date: string;
  progress: string;
  rfq_location: string;
  remarks: string;
  created_at: string;
};

export default function RfqPage() {
  const [rfqs, setRfqs] = useState<Rfq[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);

  const [selectedRfq, setSelectedRfq] = useState<Rfq | null>(null);
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

  

  return (
    <section className="space-y-2">
      <h1 className="text-2xl font-bold">RFQ</h1>
      <p className="text-muted-foreground">Requests for Quotation.</p>
    </section>
  );
}
