import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import OtpDialog from "../../components/OtpDialog";
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

export default function AuthPage() {
  const { loginWithPassword } = useAuth();
  const navigate = useNavigate();
  const location = useLocation() as any;

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [openOtp, setOpenOtp] = useState(false);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await loginWithPassword(email, password);
      setOpenOtp(true);
    } finally {
      setLoading(false);
    }
  };

  const handleOtpSuccess = () => {
    const to = location?.state?.from?.pathname || "/app/rfq";
    navigate(to, { replace: true });
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="text-4xl py-0 my-0 font-bold text-center">
            Sign in
          </CardTitle>
        </CardHeader>
        <Separator />
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-1">
              <label className="text-sm font-medium">Email</label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="example@ampec.cpm.au"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium">Password</label>

              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="********"
                  required
                  className="pr-10"
                />

                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Signing in..." : "Continue"}
            </Button>
          </form>

          <Separator className="my-6" />
          <div className="mt-4 text-sm text-center">
            <span className="text-muted-foreground">
              Don't have an account?{" "}
            </span>
            <span className="text-primary">Ask your admin for access.</span>
          </div>
        </CardContent>
      </Card>

      <OtpDialog
        open={openOtp}
        onOpenChange={setOpenOtp}
        onSuccess={handleOtpSuccess}
      />
    </>
  );
}
