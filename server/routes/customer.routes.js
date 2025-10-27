import express from "express";
import {
  createCustomer,
  listCustomers,
  getCustomerById,
  updateCustomer,
  deleteCustomer,
} from "../controllers/customer.controller.js";
import { authenticate } from "../utils/authMiddleware.js";

const router = express.Router();
router.post("/", authenticate, createCustomer);
router.get("/", authenticate, listCustomers);
router.get("/:id", authenticate, getCustomerById);
router.put("/:id", authenticate, updateCustomer);
router.delete("/:id", authenticate, deleteCustomer);
export default router;
