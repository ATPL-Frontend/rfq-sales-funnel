import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "../../components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";
import api from "../../lib/api";
import { dateHelper } from "../../lib/dateHelper";

type Customer = {
  id: number;
  name: string;
  email: string;
  code: string;
  created_at: string;
  updated_at: string;
};

export default function CustomerDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchCustomer = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const { data } = await api.get(`/api/customers/${id}`);
      setCustomer(data.data || null);
    } catch (err) {
      toast.error("Failed to load customer details");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchCustomer();
  }, [fetchCustomer]);

  if (loading)
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        Loading customer details...
      </div>
    );

  if (!customer)
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4 text-center">
        <p className="text-muted-foreground">
          Customer not found or no data available.
        </p>
        <Button variant="secondary" onClick={() => navigate(-1)}>
          Go Back
        </Button>
      </div>
    );

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Customer Details</CardTitle>
          <Button variant="secondary" onClick={() => navigate(-1)}>
            Back
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-y-2">
          <p className="font-medium text-muted-foreground">ID</p>
          <p>{customer.id}</p>

          <p className="font-medium text-muted-foreground">Name</p>
          <p>{customer.name}</p>

          <p className="font-medium text-muted-foreground">Email</p>
          <p>{customer.email}</p>

          <p className="font-medium text-muted-foreground">Code</p>
          <p>{customer.code}</p>

          <p className="font-medium text-muted-foreground">Created At</p>
          <p>{new Date(customer.created_at).toLocaleString()}</p>

          <p className="font-medium text-muted-foreground">Updated At</p>
          <p>{dateHelper(customer.updated_at)}</p>
        </div>
      </CardContent>
    </Card>
  );
}
