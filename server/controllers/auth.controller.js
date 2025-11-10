import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { pool } from "../lib/dbconnect-mysql.js";
import { sendMail } from "../utils/email.js"; // <-- must be configured to send email (SMTP)

// Generate 6-digit OTP
const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();

/**
 * 🧩 Register a new user
 */
export async function register(req, res) {
  const { name, email, password, short_form, role = "user" } = req.body;
  const errors = {};

  if (!name) errors.name = "Name is required";
  if (!email) errors.email = "Email is required";
  if (!password) errors.password = "Password is required";
  if (!short_form) errors.short_form = "Short form is required";

  if (Object.keys(errors).length > 0) {
    return res.status(400).json({
      success: false,
      message: "Missing required fields",
      errors,
    });
  }

  try {
    // Find role_id from roles table
    const [roleRows] = await pool.query("SELECT id FROM roles WHERE name=?", [role]);
    const roleId = roleRows[0]?.id;
    if (!roleId) return res.status(400).json({ success: false, message: `Invalid role: ${role}` });

    const hashed = await bcrypt.hash(password, 10);
    await pool.query(
      "INSERT INTO users (name, email, short_form, password, role_id) VALUES (?, ?, ?, ?, ?)",
      [name, email, short_form, hashed, roleId]
    );

    res.status(201).json({ success: true, message: "User registered successfully" });
  } catch (err) {
    if (err.code === "ER_DUP_ENTRY") {
      return res.status(409).json({ success: false, message: "Email already exists" });
    }
    res.status(500).json({ success: false, message: err.message });
  }
}

/**
 * 🔐 Step 1 — Login (password verified, OTP sent to email)
 */
export async function login(req, res) {
  try {
    const { email, password } = req.body;
    const [rows] = await pool.query(
      `SELECT u.*, r.name AS role_name
       FROM users u
       LEFT JOIN roles r ON u.role_id = r.id
       WHERE u.email=?`,
      [email]
    );

    if (!rows.length) return res.status(404).json({ success: false, message: "User not found" });

    const user = rows[0];
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ success: false, message: "Invalid password" });

    // ✅ Generate and save OTP
    const otp = generateOTP();
    const expiry = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes expiry

    await pool.query("UPDATE users SET otp_code=?, otp_expires=? WHERE id=?", [
      otp,
      expiry,
      user.id,
    ]);

    // ✅ Send OTP via email
    await sendMail(
      user.email,
      "Your AMPEC Login OTP",
      `<p>Hello ${user.name},</p>
       <p>Your One-Time Password (OTP) is:</p>
       <h2>${otp}</h2>
       <p>This code will expire in <b>5 minutes</b>.</p>`
    );

    res.json({
      success: true,
      message: "OTP sent to your email address",
      email: user.email,
    });
  } catch (err) {
    console.error("Login (OTP) error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
}

/**
 * 🔢 Step 2 — Verify OTP and return JWT
 */
export async function verifyOTP(req, res) {
  try {
    const { email, otp } = req.body;

    if (!email || !otp)
      return res.status(400).json({ success: false, message: "Email and OTP are required" });

    const [rows] = await pool.query(
      `SELECT u.*, r.name AS role_name
       FROM users u
       LEFT JOIN roles r ON u.role_id = r.id
       WHERE u.email=?`,
      [email]
    );

    if (!rows.length)
      return res.status(404).json({ success: false, message: "User not found" });

    const user = rows[0];

    // Validate OTP
    if (user.otp_code !== otp)
      return res.status(400).json({ success: false, message: "Invalid OTP" });

    if (!user.otp_expires || new Date(user.otp_expires) < new Date()) {
      return res.status(400).json({ success: false, message: "OTP expired" });
    }

    // ✅ Create JWT
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role_name || "user" },
      process.env.JWT_SECRET,
      { expiresIn: "2h" }
    );

    // Clear OTP after success
    await pool.query(
      "UPDATE users SET otp_code=NULL, otp_expires=NULL, token=? WHERE id=?",
      [token, user.id]
    );

    res.json({
      success: true,
      message: "Login successful",
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        short_form: user.short_form,
        role: user.role_name,
      },
    });
  } catch (err) {
    console.error("verifyOTP error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
}
