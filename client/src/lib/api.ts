import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? "https://rfq.atpldhaka.com",
  withCredentials: false,
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("auth_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

let hasRedirected = false; // 🔒 prevent multiple redirects

// Handle 401 globally
api.interceptors.response.use(
  (res) => res,
  (err) => {
    const status = err.response?.status;
    const isAuthPage = window.location.pathname.startsWith("/auth");

    if (status === 401 && !isAuthPage && !hasRedirected) {
      hasRedirected = true;
      localStorage.removeItem("auth_token");

      // Small delay so React router doesn’t re-trigger instantly
      setTimeout(() => {
        window.location.href = "/auth";
      }, 100);
    }

    return Promise.reject(err);
  }
);

export default api;
