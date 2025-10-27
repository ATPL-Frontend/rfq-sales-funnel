import express from "express";
import {
  createSalesFunnel,
  listSalesFunnels,
  getSalesFunnelById,
  updateSalesFunnel,
  deleteSalesFunnel,
} from "../controllers/salesFunnel.controller.js";
import { authenticate } from "../utils/authMiddleware.js";

const router = express.Router();
router.post("/", authenticate, createSalesFunnel);
router.get("/", authenticate, listSalesFunnels);
router.get("/:id", authenticate, getSalesFunnelById);
router.put("/:id", authenticate, updateSalesFunnel);
router.delete("/:id", authenticate, deleteSalesFunnel);
export default router;
