import express from "express";
import {
  createCustomer,
  listCustomers,
  getCustomerById,
  updateCustomer,
  deleteCustomer,
} from "../controllers/customer.controller.js";
import { authenticate, authorize } from "../utils/authMiddleware.js";

const router = express.Router();

// ================================
// CUSTOMER ROUTES WITH ROLE PERMISSIONS
// ================================

// 🟢 Create Customer
// sales-person and admin can create
router.post(
  "/",
  authenticate,
  authorize("createAny", "customer"),
  createCustomer
);

// 🟢 List Customers
// sales-person and admin can read all customers
router.get(
  "/",
  authenticate,
  authorize("readAny", "customer"),
  listCustomers
);

// 🟢 Get Single Customer
// user can read own, sales-person/admin can read any
router.get(
  "/:id",
  authenticate,
  authorize("readAny", "customer"),
  getCustomerById
);

// 🟡 Update Customer
// sales-person/admin can update
router.put(
  "/:id",
  authenticate,
  authorize("updateAny", "customer"),
  updateCustomer
);

// 🔴 Delete Customer
// only admin or super-admin can delete
router.delete(
  "/:id",
  authenticate,
  authorize("deleteAny", "customer"),
  deleteCustomer
);

export default router;
