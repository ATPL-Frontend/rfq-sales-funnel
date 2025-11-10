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

// ================================
// USER ROUTES WITH ROLE PERMISSIONS
// ================================

// 🧍 Self profile (any logged-in user)
router.get("/me", authenticate, getMe);

// 🚪 Logout (any logged-in user)
router.post("/logout", authenticate, logout);

// 🟢 List all users
// admin and super-admin → readAny
router.get(
  "/",
  authenticate,
  authorize("readAny", "user"),
  listUsers
);

// 🟢 Get single user by ID
// admin and super-admin → readAny
router.get(
  "/:id",
  authenticate,
  authorize("readAny", "user"),
  getUserById
);

// 🟡 Update user
// admin and super-admin → updateAny
router.put(
  "/:id",
  authenticate,
  authorize("updateAny", "user"),
  updateUser
);

// 🔴 Delete user
// super-admin only → deleteAny
router.delete(
  "/:id",
  authenticate,
  authorize("deleteAny", "user"),
  deleteUser
);

export default router;
