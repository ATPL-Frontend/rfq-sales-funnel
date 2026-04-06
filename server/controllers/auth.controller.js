import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { pool } from "../lib/dbconnect-mysql.js";
import { sendMail } from "../utils/email.js";
// import { sendMailResend } from "../utils/resend.js";
import { safeParseRoles } from "../utils/role.js";

// Generate 6-digit OTP
const generateOTP = () =>
  Math.floor(100000 + Math.random() * 900000).toString();

/**
 * 🧩 Register a new user
 */
export async function register(req, res) {
  try {
    let {
      name,
      email,
      password,
      short_form,
      roles = [],
      user_type = "system_user",
    } = req.body;

    if (!name || !short_form) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    if (user_type === "system_user") {
      if (!email || !password) {
        return res.status(400).json({
          message: "Email and password required for system_user",
        });
      }
    }

    email = email ? String(email).trim().toLowerCase() : null;
    short_form = String(short_form).trim();
    name = String(name).trim();

    if (!Array.isArray(roles)) roles = [roles];
    roles = roles.map((r) => String(r).trim()).filter(Boolean);

    if (user_type === "sales_person") {
      roles = ["sales-person"];
    }

    if (roles.length === 0) {
      return res
        .status(400)
        .json({ message: "At least one valid role is required" });
    }

    const [valid] = await pool.query(
      "SELECT name, id FROM roles WHERE name IN (?)",
      [roles],
    );

    if (valid.length !== roles.length) {
      return res.status(400).json({
        message: "One or more invalid role names",
      });
    }

    // Check existing email before create
    if (email) {
      const [existingUsers] = await pool.query(
        "SELECT id FROM users WHERE email = ? LIMIT 1",
        [email],
      );

      if (existingUsers.length > 0) {
        return res.status(409).json({
          success: false,
          message: "Email already exists",
        });
      }
    }

    const hashed = password ? await bcrypt.hash(password, 10) : null;

    const [result] = await pool.query(
      `INSERT INTO users (name, email, short_form, password, user_type)
       VALUES (?, ?, ?, ?, ?)`,
      [name, email, short_form, hashed, user_type],
    );

    const userId = result.insertId;

    const values = valid.map((role) => [userId, role.id]);
    await pool.query("INSERT INTO user_roles (user_id, role_id) VALUES ?", [
      values,
    ]);

    const [[newUser]] = await pool.query(
      `SELECT 
        u.id,
        u.name,
        u.email,
        u.short_form,
        u.user_type,
        JSON_ARRAYAGG(r.name) AS roles
       FROM users u
       LEFT JOIN user_roles ur ON ur.user_id = u.id
       LEFT JOIN roles r ON r.id = ur.role_id
       WHERE u.id = ?
       GROUP BY u.id`,
      [userId],
    );

    newUser.roles = safeParseRoles(newUser.roles);

    return res.status(201).json({
      success: true,
      message: "User created successfully",
      data: newUser,
    });
  } catch (err) {
    console.error("register error:", err);
    return res.status(500).json({ message: err.message });
  }
}

/**
 * 🔐 Step 1 — Login (password verified, OTP sent to email)
 */
export async function login(req, res) {
  try {
    const { email, password } = req.body;
    const [rows] = await pool.query(
      `SELECT u.*, JSON_ARRAYAGG(r.name) AS roles
       FROM users u
       LEFT JOIN user_roles ur ON ur.user_id = u.id
       LEFT JOIN roles r ON r.id = ur.role_id
       WHERE u.email=?
       GROUP BY u.id`,
      [email],
    );

    if (!rows.length)
      return res
        .status(404)
        .json({ success: false, message: "User not found" });

    const user = rows[0];

    const valid = await bcrypt.compare(password, user.password);
    if (!valid)
      return res
        .status(401)
        .json({ success: false, message: "Invalid password" });

    // ✅ Generate and save OTP
    const otp = generateOTP();
    const expiry = new Date(Date.now() + 5 * 60 * 1000).toISOString(); // 5 minutes from now

    await pool.query("UPDATE users SET otp_code=?, otp_expires=? WHERE id=?", [
      otp,
      expiry,
      user.id,
    ]);

    // ✅ Send OTP via email
    await sendMail(
      user.email,
      "Your RFQ Login OTP",
      `<p>Hello ${user.name},</p>
       <p>Your One-Time Password (OTP) is:</p>
       <h2>${otp}</h2>
       <p>This code will expire in <b>5 minutes</b>.</p>`
    );

    // ✅ Send OTP via SMS
    // await sendMailResend(
    //   user.email,
    //   "Your RFQ Login OTP",
    //   `<p>Hello ${user.name},</p>
    //    <p>Your One-Time Password (OTP) is:</p>
    //    <h2>${otp}</h2>
    //    <p>This code will expire in <b>5 minutes</b>.</p>`,
    // );

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
      return res
        .status(400)
        .json({ success: false, message: "Email and OTP are required" });

    const [rows] = await pool.query(
      `SELECT u.*, JSON_ARRAYAGG(r.name) AS roles
       FROM users u
       LEFT JOIN user_roles ur ON ur.user_id = u.id
       LEFT JOIN roles r ON r.id = ur.role_id
       WHERE u.email=?
       GROUP BY u.id`,
      [email],
    );

    if (!rows.length)
      return res
        .status(404)
        .json({ success: false, message: "User not found" });

    const user = rows[0];

    // ---- FIXED HERE ----
    const roles = safeParseRoles(user.roles);

    // Validate OTP
    if (user.otp_code !== otp)
      return res.status(400).json({ success: false, message: "Invalid OTP" });

    const otpExpiry = new Date(user.otp_expires + " UTC");

    if (otpExpiry < new Date()) {
      return res.status(400).json({ success: false, message: "OTP expired" });
    }

    // Create JWT
    const token = jwt.sign(
      { id: user.id, email: user.email, roles },
      process.env.JWT_SECRET,
      { expiresIn: "8h" },
    );

    // Clear OTP
    await pool.query(
      "UPDATE users SET otp_code=NULL, otp_expires=NULL, token=? WHERE id=?",
      [token, user.id],
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
        roles,
      },
    });
  } catch (err) {
    console.error("verifyOTP error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
}
