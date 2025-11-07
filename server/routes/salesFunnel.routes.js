import express from "express";
import {
  createSalesFunnel,
  listSalesFunnels,
  getSalesFunnelById,
  updateSalesFunnel,
  deleteSalesFunnel,
} from "../controllers/salesFunnel.controller.js";
import { authenticate, authorize } from "../utils/authMiddleware.js";

const router = express.Router();

// ================================
// SALES FUNNEL ROUTES WITH ROLE PERMISSIONS
// ================================

// 🟢 Create Sales Funnel
// sales-person, admin, super-admin → createAny
router.post(
  "/",
  authenticate,
  authorize("createAny", "sales-funnel"),
  createSalesFunnel
);

// 🟢 List all Sales Funnels
// sales-person, admin, super-admin → readAny
router.get(
  "/",
  authenticate,
  authorize("readAny", "sales-funnel"),
  listSalesFunnels
);

// 🟢 Get single Sales Funnel
// sales-person, admin, super-admin → readAny
router.get(
  "/:id",
  authenticate,
  authorize("readAny", "sales-funnel"),
  getSalesFunnelById
);

// 🟡 Update Sales Funnel
// sales-person, admin, super-admin → updateAny
router.put(
  "/:id",
  authenticate,
  authorize("updateAny", "sales-funnel"),
  updateSalesFunnel
);

// 🔴 Delete Sales Funnel
// admin, super-admin → deleteAny
router.delete(
  "/:id",
  authenticate,
  authorize("deleteAny", "sales-funnel"),
  deleteSalesFunnel
);

export default router;
