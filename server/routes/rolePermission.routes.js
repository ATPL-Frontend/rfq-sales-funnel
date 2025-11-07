import express from "express";
import {
  listRoles,
  listPermissions,
  getRolePermissions,
  assignPermissions,
} from "../controllers/rolePermission.controller.js";
import { authenticate } from "../utils/authMiddleware.js"; // JWT auth middleware

const router = express.Router();

// Protect all routes with authentication
router.use(authenticate);

// List roles & permissions
router.get("/roles", listRoles);
router.get("/permissions", listPermissions);

// Role-specific permissions
router.get("/roles/:id/permissions", getRolePermissions);
router.post("/roles/:id/permissions", assignPermissions);

export default router;
