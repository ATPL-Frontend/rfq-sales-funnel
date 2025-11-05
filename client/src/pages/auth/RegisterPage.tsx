import { useState } from "react";
import toast from "react-hot-toast";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "../../components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { Separator } from "../../components/ui/separator";
import { useAuth } from "../../lib/auth";

export default function RegisterPage() {
  const { registerUser } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [short_form, setShort_form] = useState("");
  const [role, setRole] = useState("");

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await registerUser(email, password, name, short_form, role);
      navigate("/auth");
    } catch (err: any) {
      toast.error(err?.message);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-4xl py-0 my-0 font-bold text-center">
          Create account
        </CardTitle>
      </CardHeader>
      <Separator />
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="text-sm font-medium">Name</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">Email</label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">Short Form</label>
            <Input
              type="text"
              value={short_form}
              onChange={(e) => setShort_form(e.target.value)}
              required
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">Password</label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">Role</label>
            <Input
              type="text"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              required
            />
          </div>
          <Button type="submit" className="w-full">
            Create account
          </Button>
        </form>
        <Separator className="my-6" />
        <div className="mt-4 text-sm text-center">
          <span className="text-muted-foreground">
            Already have an account?{" "}
          </span>
          <Link to="/auth" className="underline">
            Sign in
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
