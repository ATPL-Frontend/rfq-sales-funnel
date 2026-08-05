import { createBrowserRouter, Navigate } from "react-router-dom";
import AppLayout from "../../layouts/AppLayout";
import AuthLayout from "../../layouts/AuthLayout";
import { ProtectedRoute, PublicOnlyRoute } from "../../lib/auth";
import CustomerDetailsPage from "../app/CustomerDetailsPage";
import CustomersPage from "../app/CustomersPage";
import RfqPage from "../app/RfqPage";
import SalesFunnelPage from "../app/SalesFunnelPage";
import UserDetailsPage from "../app/UserDetailsPage";
import InvoicesPage from "../app/InvoicesPage";
import UsersPage from "../app/UsersPage";
import AuthPage from "../auth/AuthPage";
// import RegisterPage from "../auth/RegisterPage";
import NotFoundPage from "../misc/NotFoundPage";
import InvoiceDetailsPage from "../app/InvoiceDetailsPage";
import InvoiceSummary from "../app/InvoiceSummary";
import InvoiceFrequency from "../app/InvoiceFrequency";
import BuySale from "../app/BuySale";
import SavedQuotationListPage from "../app/QuoteList";
import BuySaleItemListPage from "../app/ItemList";

export const router = createBrowserRouter([
  { path: "/", element: <Navigate to="/app" replace /> },
  {
    path: "/auth",
    element: (
      <PublicOnlyRoute>
        <AuthLayout />
      </PublicOnlyRoute>
    ),
    children: [
      { index: true, element: <AuthPage /> },
      // { path: "register", element: <RegisterPage /> },
    ],
  },
  {
    path: "/app",
    element: (
      <ProtectedRoute>
        <AppLayout />
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: <Navigate to="users" replace /> },
      { path: "users", element: <UsersPage /> },
      { path: "users/:id", element: <UserDetailsPage /> },
      { path: "customers", element: <CustomersPage /> },
      { path: "customers/:id", element: <CustomerDetailsPage /> },
      { path: "rfq", element: <RfqPage /> },
      { path: "sales-funnel", element: <SalesFunnelPage /> },
      { path: "invoices", element: <InvoicesPage /> },
      { path: "invoices/:id", element: <InvoiceDetailsPage /> },
      { path: "summary", element: <InvoiceSummary /> },
      { path: "invoice-frequency", element: <InvoiceFrequency /> },
      { path: "buy-sale", element: <BuySale /> },
      { path: "quote-list", element: <SavedQuotationListPage /> },
      { path: "item-list", element: <BuySaleItemListPage /> },
    ],
  },
  { path: "*", element: <NotFoundPage /> },
]);
