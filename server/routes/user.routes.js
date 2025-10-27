import express from "express";
import { authenticate, authorize } from "../utils/authMiddleware.js";
import {
  listUsers,
  getUserById,
  getMe,
  updateUser,
  deleteUser,
  logout,
} from "../controllers/user.controller.js";

const router = express.Router();

// Self profile
router.get("/me", authenticate, getMe);
router.post("/logout", authenticate, logout);

// Admin/super-admin management
router.get("/", authenticate, authorize("admin", "super-admin"), listUsers);
router.get("/:id", authenticate, authorize("admin", "super-admin"), getUserById);
router.put("/:id", authenticate, authorize("admin", "super-admin"), updateUser);
router.delete("/:id", authenticate, authorize("admin", "super-admin"), deleteUser);

export default router;
