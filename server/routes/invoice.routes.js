import express from "express";
import {
  createInvoice,
  deleteInvoice,
  getInvoiceById,
  listInvoices,
  updateInvoice,
} from "../controllers/invoice.controller.js";
import { authenticate, authorize } from "../utils/authMiddleware.js";

const router = express.Router();

router.post(
  "/",
  authenticate,
  authorize("salesperson", "admin", "super-admin"),
  createInvoice
);
router.get("/", authenticate, listInvoices);
router.get("/:id", authenticate, getInvoiceById);
router.put(
  "/:id",
  authenticate,
  authorize("salesperson", "admin", "super-admin"),
  updateInvoice
);
router.delete(
  "/:id",
  authenticate,
  authorize("admin", "super-admin"),
  deleteInvoice
);

export default router;
