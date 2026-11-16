import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? "https://rfq.atpldhaka.com",
  withCredentials: false,
});

// All protected requests use the token saved after password login.
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("auth_token");

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  // Let the browser set the multipart boundary for FormData uploads.
  if (config.data instanceof FormData) {
    delete config.headers["Content-Type"];
  } else if (!config.headers["Content-Type"]) {
    config.headers["Content-Type"] = "application/json";
  }

  return config;
});

let hasRedirected = false;

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const endpoint = String(error.config?.url ?? "");
    const isAuthRequest = endpoint.startsWith("/api/auth/");
    const isLogoutRequest = endpoint.startsWith("/api/users/logout");
    const isOnAuthPage = window.location.pathname.startsWith("/auth");
    const hasToken = Boolean(localStorage.getItem("auth_token"));

    // Bad login credentials must NOT trigger the global redirect.
    // A 401 from a protected API indicates the stored session has expired.
    if (
      status === 401 &&
      hasToken &&
      !isAuthRequest &&
      !isLogoutRequest &&
      !isOnAuthPage &&
      !hasRedirected
    ) {
      hasRedirected = true;
      localStorage.removeItem("auth_token");
      localStorage.removeItem("auth_user");
      window.location.replace("/auth");
    }

    return Promise.reject(error);
  },
);

export default api;
