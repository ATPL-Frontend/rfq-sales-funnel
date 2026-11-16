import axios from "axios";
import * as React from "react";
import toast from "react-hot-toast";
import { Navigate, useLocation } from "react-router-dom";
import api from "./api";

export type AuthUser = {
  id: string | number;
  name?: string;
  email: string;
  short_form?: string;
  role?: string;
  roles?: string[];
} | null;

type PendingOtp = { email: string; transactionId?: string } | null;

type AuthContextType = {
  user: AuthUser;
  token: string | null;
  loginWithPassword: (email: string, password: string) => Promise<void>;
  registerUser: (
    email: string,
    password: string,
    name: string,
    short_form: string,
    role: string,
  ) => Promise<void>;
  logout: () => Promise<void>;
  // Compatibility only, so existing imports from the old OTP UI still compile.
  needsOtp: boolean;
  pending: PendingOtp;
  verifyOtp: (otp: string) => Promise<void>;
};

type LoginResponse = {
  success: boolean;
  message?: string;
  token?: string;
  user?: {
    id: string | number;
    email: string;
    name?: string;
    short_form?: string;
    role?: string;
    roles?: unknown;
  };
};

const AuthContext = React.createContext<AuthContextType | undefined>(undefined);

function readStoredUser(): AuthUser {
  try {
    const stored = localStorage.getItem("auth_user");
    return stored ? (JSON.parse(stored) as AuthUser) : null;
  } catch {
    localStorage.removeItem("auth_user");
    return null;
  }
}

function parseRoles(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === "string");
  }

  if (typeof value === "string") {
    try {
      const parsed: unknown = JSON.parse(value);
      if (Array.isArray(parsed)) return parseRoles(parsed);
    } catch {
      // Plain role name rather than JSON.
    }
    return value ? [value] : [];
  }

  return [];
}

function errorMessage(error: unknown, fallback: string): string {
  if (axios.isAxiosError(error)) {
    const serverMessage: unknown = error.response?.data?.message;
    if (typeof serverMessage === "string") return serverMessage;
    return error.message || fallback;
  }
  return error instanceof Error ? error.message : fallback;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<AuthUser>(readStoredUser);
  const [token, setToken] = React.useState<string | null>(() =>
    localStorage.getItem("auth_token"),
  );

  const clearSession = React.useCallback(() => {
    localStorage.removeItem("auth_token");
    localStorage.removeItem("auth_user");
    setUser(null);
    setToken(null);
  }, []);

  const loginWithPassword = React.useCallback(
    async (email: string, password: string) => {
      const toastId = toast.loading("Signing in...");
      try {
        const { data } = await api.post<LoginResponse>("/api/auth/login", {
          email: email.trim(),
          password,
        });

        if (
          data.success !== true ||
          typeof data.token !== "string" ||
          !data.token ||
          !data.user ||
          (typeof data.user.id !== "string" &&
            typeof data.user.id !== "number") ||
          typeof data.user.email !== "string"
        ) {
          throw new Error(
            data.message ||
              "Login response does not include a valid token and user",
          );
        }

        const roles = parseRoles(data.user.roles);
        const receivedUser: NonNullable<AuthUser> = {
          id: data.user.id,
          name: data.user.name,
          email: data.user.email,
          short_form: data.user.short_form,
          roles,
          role: data.user.role ?? roles[0],
        };

        // No OTP: persist the session returned by the password login endpoint.
        localStorage.setItem("auth_token", data.token);
        localStorage.setItem("auth_user", JSON.stringify(receivedUser));
        setToken(data.token);
        setUser(receivedUser);
        toast.success("Login successful");
      } catch (error: unknown) {
        const message = errorMessage(error, "Login failed");
        toast.error(message);
        throw new Error(message);
      } finally {
        toast.dismiss(toastId);
      }
    },
    [],
  );

  const registerUser = React.useCallback(
    async (
      email: string,
      password: string,
      name: string,
      short_form: string,
      role: string,
    ) => {
      const toastId = toast.loading("Signing up...");
      try {
        await api.post("/api/auth/register", {
          email,
          password,
          name,
          short_form,
          role,
        });
        toast.success("Registered. Please sign in.");
      } catch (error: unknown) {
        const message = errorMessage(error, "Registration failed");
        toast.error(message);
        throw new Error(message);
      } finally {
        toast.dismiss(toastId);
      }
    },
    [],
  );

  // Retained temporarily only to avoid breaking unused old OTP components.
  const verifyOtp = React.useCallback(async (_otp: string): Promise<void> => {
    throw new Error("OTP verification is disabled. Please sign in directly.");
  }, []);

  const logout = React.useCallback(async () => {
    try {
      await api.post("/api/users/logout", {});
    } catch (error) {
      // Even if the server rejects an expired token, log out locally.
      console.warn("Logout request failed:", error);
    } finally {
      clearSession();
      toast.success("Logged out");
      window.location.replace("/auth");
    }
  }, [clearSession]);

  const value = React.useMemo<AuthContextType>(
    () => ({
      user,
      token,
      loginWithPassword,
      registerUser,
      logout,
      needsOtp: false,
      pending: null,
      verifyOtp,
    }),
    [user, token, loginWithPassword, registerUser, logout, verifyOtp],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = React.useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}

// Frontend route guard: API routes MUST enforce JWT authorization themselves.
// We intentionally avoid /api/users/me here, so a missing /me endpoint cannot
// block navigation after a successful login. API 401 responses clear the session.
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
    return <Navigate to="/app/rfq" replace />;
  }

  return <>{children}</>;
}
