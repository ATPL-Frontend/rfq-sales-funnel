import express from "express";
import {
  createRFQ,
  listRFQs,
  getRFQById,
  updateRFQ,
  deleteRFQ,
} from "../controllers/rfq.controller.js";
import { authenticate, authorize } from "../utils/authMiddleware.js";

const router = express.Router();

// ================================
// RFQ ROUTES WITH ROLE PERMISSIONS
// ================================

// 🟢 Create RFQ
// user → createOwn
// sales-person/admin → createAny
router.post(
  "/",
  authenticate,
  authorize("createOwn", "rfq"),
  createRFQ
);

// 🟢 List all RFQs
// sales-person/admin → readAny
router.get(
  "/",
  authenticate,
  authorize("readAny", "rfq"),
  listRFQs
);

// 🟢 Get single RFQ by ID
// user → readOwn
// sales-person/admin → readAny
router.get(
  "/:id",
  authenticate,
  authorize("readAny", "rfq"),
  getRFQById
);

// 🟡 Update RFQ
// user → updateOwn
// sales-person/admin → updateAny
router.put(
  "/:id",
  authenticate,
  authorize("updateAny", "rfq"),
  updateRFQ
);

// 🔴 Delete RFQ
// admin/super-admin only → deleteAny
router.delete(
  "/:id",
  authenticate,
  authorize("deleteAny", "rfq"),
  deleteRFQ
);

export default router;
