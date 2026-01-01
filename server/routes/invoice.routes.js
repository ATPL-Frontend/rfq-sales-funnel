import express from "express";
import {
  createInvoice,
  deleteInvoice,
  getInvoiceById,
  listInvoices,
  updateInvoice,
  getInvoiceSummary,
  getInvoiceMonthlySummary
} from "../controllers/invoice.controller.js";
import { authenticate, authorize } from "../utils/authMiddleware.js";

const router = express.Router();

// ================================
// INVOICE ROUTES WITH ROLE PERMISSIONS
// ================================

// 🟢 Create Invoice
// sales-person, admin, and super-admin → createAny
router.post(
  "/",
  authenticate,
  authorize("createAny", "invoice"),
  createInvoice
);

// 📊 Get Invoice Summary
// sales-person, admin, super-admin → readAny
router.get(
  "/summary",
  authenticate,
  authorize("readAny", "invoice"),
  getInvoiceSummary
);

// 📊 Get Invoice Monthly Summary
// sales-person, admin, super-admin → readAny
router.get(
  "/monthly-summary",
  authenticate,
  authorize("readAny", "invoice"),
  getInvoiceMonthlySummary
);

// 🟢 List all Invoices
// sales-person, admin, super-admin → readAny
router.get(
  "/",
  authenticate,
  authorize("readAny", "invoice"),
  listInvoices
);

// 🟢 Get single Invoice by ID
// sales-person, admin, super-admin → readAny
router.get(
  "/:id",
  authenticate,
  authorize("readAny", "invoice"),
  getInvoiceById
);

// 🟡 Update Invoice
// sales-person, admin, super-admin → updateAny
router.put(
  "/:id",
  authenticate,
  authorize("updateAny", "invoice"),
  updateInvoice
);

// 🔴 Delete Invoice
// only admin and super-admin → deleteAny
router.delete(
  "/:id",
  authenticate,
  authorize("deleteAny", "invoice"),
  deleteInvoice
);

export default router;
