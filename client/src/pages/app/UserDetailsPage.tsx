import React from "react";
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

type User = {
  id: number;
  name: string;
  email: string;
  short_form: string;
  role: string[];
  created_at: string;
};

export default function UserDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [user, setUser] = React.useState<User | null>(null);
  const [loading, setLoading] = React.useState(false);

  const fetchUser = React.useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const { data } = await api.get(`/api/users/${id}`);
      setUser(data);
    } catch (err) {
      toast.error("Failed to load user details");
    } finally {
      setLoading(false);
    }
  }, [id]);

  React.useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        Loading user details...
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4 text-center">
        <p className="text-muted-foreground">
          User not found or no data available.
        </p>
        <Button variant="secondary" onClick={() => navigate(-1)}>
          Go Back
        </Button>
      </div>
    );
  }

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>User Details</CardTitle>
          <Button variant="secondary" onClick={() => navigate(-1)}>
            Back
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-y-2">
          <p className="font-medium text-muted-foreground">ID</p>
          <p>{user.id}</p>

          <p className="font-medium text-muted-foreground">Name</p>
          <p>{user.name}</p>

          <p className="font-medium text-muted-foreground">Email</p>
          <p>{user.email}</p>

          <p className="font-medium text-muted-foreground">Short Form</p>
          <p>{user.short_form}</p>

          <p className="font-medium text-muted-foreground">Role</p>
          <p>{user.role.join(", ")}</p>

          <p className="font-medium text-muted-foreground">Created At</p>
          <p>{dateHelper(user.created_at)}</p>
        </div>
      </CardContent>
    </Card>
  );
}
