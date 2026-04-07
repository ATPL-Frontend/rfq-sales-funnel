import ReactDOM from "react-dom/client";
import { Toaster } from "react-hot-toast";
import { RouterProvider } from "react-router-dom";
import { ThemeProvider } from "./components/theme-provider";
import "./index.css";
import { AuthProvider } from "./lib/auth";
import { router } from "./pages/routes/router";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
    <AuthProvider>
      <RouterProvider router={router} />
      <Toaster position="top-right" />
    </AuthProvider>
  </ThemeProvider>,
);
