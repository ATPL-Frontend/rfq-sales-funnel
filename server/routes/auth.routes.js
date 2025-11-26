import express from "express";
import { login, register, verifyOTP } from "../controllers/auth.controller.js";
import { authenticate, authorize } from "../utils/authMiddleware.js";

const router = express.Router();
router.post(
  "/register",
  // authenticate,
  // authorize("createAny", "user"),
  register
);
router.post("/login", login);
router.post("/verify-otp", verifyOTP);

export default router;
