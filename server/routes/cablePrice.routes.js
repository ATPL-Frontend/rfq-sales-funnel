import express from "express";
import multer from "multer";

import {
  analyzeCablePriceWorkbook,
  cablePriceSummary,
  searchCablePrice,
  uploadCablePrices,
} from "../controllers/cablePrice.controller.js";

import { authenticate } from "../utils/authMiddleware.js";

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),

  limits: {
    fileSize: 30 * 1024 * 1024,
  },

  fileFilter: (req, file, callback) => {
    const name = file.originalname.toLowerCase();

    if (!name.endsWith(".xls") && !name.endsWith(".xlsx")) {
      return callback(new Error("Only XLS and XLSX files are allowed."));
    }

    callback(null, true);
  },
});

router.get("/search", authenticate, searchCablePrice);

router.get("/summary", authenticate, cablePriceSummary);

router.post(
  "/analyze",
  authenticate,
  upload.single("file"),
  analyzeCablePriceWorkbook,
);

router.post("/upload", authenticate, upload.single("file"), uploadCablePrices);

export default router;
