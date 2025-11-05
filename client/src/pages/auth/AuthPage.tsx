// import { ArrowRight } from "lucide-react";
// import { useState } from "react";
// import { Link, useLocation, useNavigate } from "react-router-dom";
// import { Button } from "../../components/ui/button";
// import {
//   Card,
//   CardContent,
//   CardHeader,
//   CardTitle,
// } from "../../components/ui/card";
// import { Input } from "../../components/ui/input";
// import { Separator } from "../../components/ui/separator";
// import { useAuth } from "../../lib/auth";

// export default function AuthPage() {
//   const { login } = useAuth();
//   const navigate = useNavigate();
//   const location = useLocation();
//   const [formData, setFormData] = useState({
//     email: "",
//     password: "",
//   });

//   const onSubmit = (e: React.FormEvent) => {
//     e.preventDefault();
//     console.log(formData);

//     // login("demo");
//     // const to = location?.state?.from?.pathname || "/app/rfq";
//     // navigate(to, { replace: true });
//   };

//   return (
//     <Card>
//       <CardHeader>
//         <CardTitle className="text-4xl py-0 my-0 font-bold text-center">
//           Sign in
//         </CardTitle>
//       </CardHeader>
//       <Separator />
//       <CardContent>
//         <form onSubmit={onSubmit} className="space-y-4">
//           <div className="space-y-1">
//             <label className="text-sm font-medium">Email</label>
//             <Input
//               type="email"
//               placeholder="Please enter your email"
//               required
//               onChange={(e) =>
//                 setFormData({ ...formData, email: e.target.value })
//               }
//             />
//           </div>
//           <div className="space-y-1">
//             <label className="text-sm font-medium">Password</label>
//             <Input
//               type="password"
//               placeholder="Please enter your password"
//               required
//               onChange={(e) =>
//                 setFormData({ ...formData, password: e.target.value })
//               }
//             />
//           </div>
//           <Button type="submit" className="w-full">
//             Continue
//             <ArrowRight strokeWidth={3} />
//           </Button>
//         </form>
//         <Separator className="my-6" />
//         <div className="text-center text-gray-500 text-sm">
//           Don&apos;t have an account?{" "}
//           <Link
//             to="/register"
//             className="hover:text-teal-800 hover:underline text-primary"
//           >
//             Sign up
//           </Link>
//         </div>
//       </CardContent>
//     </Card>
//   );
// }

import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
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
  const { loginWithPassword, needsOtp } = useAuth();
  const navigate = useNavigate();
  const location = useLocation() as any;

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [openOtp, setOpenOtp] = useState(false);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await loginWithPassword(email, password);
      // show OTP modal when backend indicates success
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
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Signing in..." : "Continue"}
            </Button>
          </form>

          <Separator className="my-6" />
          <div className="mt-4 text-sm text-center">
            <span className="text-muted-foreground">
              Don't have an account?{" "}
            </span>
            <Link
              to="/auth/register"
              className="hover:text-teal-800 hover:underline text-primary"
            >
              Register
            </Link>
          </div>
        </CardContent>
      </Card>

      <OtpDialog
        open={openOtp || needsOtp}
        onOpenChange={setOpenOtp}
        onSuccess={handleOtpSuccess}
      />
    </>
  );
}
