import React from "react";
import toast from "react-hot-toast";
import api from "./api";

export type AuthUser = {
  id: string | number;
  name?: string;
  email: string;
  role?: string;
} | null;

type PendingOtp = { email: string; transactionId?: string } | null;

type AuthContextType = {
  user: AuthUser;
  token: string | null;
  needsOtp: boolean;
  pending: PendingOtp;
  loginWithPassword: (email: string, password: string) => Promise<void>;
  registerUser: (
    email: string,
    password: string,
    name: string,
    short_form: string,
    role: string
  ) => Promise<void>;
  verifyOtp: (otp: string) => Promise<void>;
  logout: () => void;
};

const AuthContext = React.createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<AuthUser | null>(() => {
    const stored = localStorage.getItem("auth_user");
    return stored ? JSON.parse(stored) : null;
  });
  const [token, setToken] = React.useState<string | null>(() =>
    localStorage.getItem("auth_token")
  );
  const [pending, setPending] = React.useState<PendingOtp>(null);
  const [needsOtp, setNeedsOtp] = React.useState(false);

  const loginWithPassword = async (email: string, password: string) => {
    try {
      const loading = toast.loading("Signing in...");
      const { data } = await api.post("/api/auth/login", { email, password });
      toast.dismiss(loading);

      // If API returns a transaction or any meta, capture it. Adjust keys as needed.
      const transactionId = (data?.transactionId ??
        data?.trxId ??
        data?.txid) as string | undefined;

      setPending({ email, transactionId });
      setNeedsOtp(true);
      toast.success("OTP sent. Check your email/phone.");
    } catch (err: any) {
      toast.dismiss();
      const msg =
        err?.response?.data?.message || err?.message || "Login failed";
      toast.error(msg);
      throw err;
    }
  };

  const registerUser = async (
    email: string,
    password: string,
    name: string,
    short_form: string,
    role: string
  ) => {
    try {
      const loading = toast.loading("Signing up...");
      const { data } = await api.post("/api/auth/register", {
        email,
        password,
        name,
        short_form,
        role,
      });
      toast.dismiss(loading);
      toast.success("Registered (demo). Please sign in.");
    } catch (err: any) {
      toast.dismiss();
      const msg =
        err?.response?.data?.message || err?.message || "Registration failed";
      toast.error(msg);
      throw err;
    }
  };

  const verifyOtp = async (otp: string) => {
    if (!pending?.email) {
      toast.error("No pending login session.");
      throw new Error("No pending OTP session");
    }
    try {
      const loading = toast.loading("Verifying OTP...");
      // If your backend uses a different path/body, edit here:
      const otpPath =
        import.meta.env.VITE_OTP_VERIFY_PATH ?? "/api/auth/verify-otp";
      const body: Record<string, unknown> = {
        email: pending.email,
        otp,
      };
      if (pending.transactionId) body.transactionId = pending.transactionId;

      const { data } = await api.post(otpPath, body);
      toast.dismiss(loading);
      const message = data?.message || "OTP verified successfully";
      toast.success(message);

      const receivedToken = (data?.token ?? data?.accessToken) as
        | string
        | undefined;
      if (!receivedToken) throw new Error("Token not found in response");

      const receivedUser: AuthUser = {
        id: data?.user?.id ?? data?.userId,
        name: data?.user?.name,
        email: data?.user?.email,
        role: data?.user?.role,
      };

      localStorage.setItem("auth_token", receivedToken);
      localStorage.setItem("auth_user", JSON.stringify(receivedUser));
      setToken(receivedToken);
      setUser(receivedUser);

      setNeedsOtp(false);
      setPending(null);
    } catch (err: any) {
      toast.dismiss();
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        "OTP verification failed";
      toast.error(msg);
      throw err;
    }
  };

  const logout = () => {
    localStorage.removeItem("auth_token");
    localStorage.removeItem("auth_user");
    setToken(null);
    setUser(null);
    setNeedsOtp(false);
    setPending(null);
  };

  const value = React.useMemo(
    () => ({
      user,
      token,
      needsOtp,
      pending,
      loginWithPassword,
      registerUser,
      verifyOtp,
      logout,
    }),
    [user, token, needsOtp, pending]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = React.useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

// Route guards (unchanged API)
import { Navigate, useLocation } from "react-router-dom";

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { token } = useAuth();
  const location = useLocation();
  if (!token) {
    return <Navigate to="/auth" replace state={{ from: location }} />;
  }
  return <>{children}</>;
}

export function PublicOnlyRoute({ children }: { children: React.ReactNode }) {
  const { token } = useAuth();
  if (token) {
    return <Navigate to="/app/users" replace />;
  }
  return <>{children}</>;
}
