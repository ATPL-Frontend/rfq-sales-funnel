import express from "express";

import {
  lookupBuySalePart,
  uploadItemPrices,
  uploadPartMappings,
  uploadStockList,
} from "../controllers/buySale.controller.js";

import { excelUpload } from "../middleware/excelUpload.middleware.js";

import { authenticate, authorize } from "../utils/authMiddleware.js";

const router = express.Router();

// ========================================
// BUY-SALE EXCEL UPLOAD ROUTES
// ========================================

// Upload or replace PEM stock data
router.post(
  "/uploads/stock",
  authenticate,
  authorize("updateAny", "buy-sale"),
  excelUpload.single("file"),
  uploadStockList,
);

// Upload or replace Captive-to-PEM mappings
router.post(
  "/uploads/mapping",
  authenticate,
  authorize("updateAny", "buy-sale"),
  excelUpload.single("file"),
  uploadPartMappings,
);

// Upload or replace PEM item prices
router.post(
  "/uploads/prices",
  authenticate,
  authorize("updateAny", "buy-sale"),
  excelUpload.single("file"),
  uploadItemPrices,
);

// Search a PEM or Captive part number
router.get(
  "/parts/lookup",
  authenticate,
  authorize("readAny", "buy-sale"),
  lookupBuySalePart,
);

export default router;
