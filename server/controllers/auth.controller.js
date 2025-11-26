import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { pool } from "../lib/dbconnect-mysql.js";
import { sendMail } from "../utils/email.js"; // <-- must be configured to send email (SMTP)
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
      roles = [], // <-- must be role IDs
      user_type = "system_user",
    } = req.body;

    // Validate user info
    if (!name || !short_form)
      return res.status(400).json({ message: "Missing required fields" });

    if (user_type === "system_user") {
      if (!email || !password)
        return res.status(400).json({
          message: "Email and password required for system_user",
        });
    }

    // Convert roles input to array of IDs
    if (!Array.isArray(roles)) roles = [roles];

    // Sales person -> force sales-person role
    if (user_type === "sales_person") {
      const [[salesRole]] = await pool.query(
        "SELECT id FROM roles WHERE name='sales-person'"
      );
      roles = [salesRole.id];
    }

    // Validate roles exist
    if (roles.length === 0)
      return res
        .status(400)
        .json({ message: "At least one valid role is required" });

    const [validRoleRows] = await pool.query(
      "SELECT id FROM roles WHERE id IN (?)",
      [roles]
    );

    if (validRoleRows.length !== roles.length)
      return res.status(400).json({ message: "One or more invalid role IDs" });

    // Create user
    const hashed = password ? await bcrypt.hash(password, 10) : null;

    const [result] = await pool.query(
      `INSERT INTO users (name, email, short_form, password, user_type)
       VALUES (?, ?, ?, ?, ?)`,
      [name, email, short_form, hashed, user_type]
    );

    const userId = result.insertId;

    // Insert roles into user_roles
    const values = roles.map((roleId) => [userId, roleId]);
    await pool.query("INSERT INTO user_roles (user_id, role_id) VALUES ?", [
      values,
    ]);

    // Fetch new user with roles
    const [[newUser]] = await pool.query(
      `SELECT 
      u.id, u.name, u.email, u.short_form, u.user_type,
      JSON_ARRAYAGG(r.name) AS roles
      FROM users u
      LEFT JOIN user_roles ur ON ur.user_id = u.id
      LEFT JOIN roles r ON r.id = ur.role_id
      WHERE u.id = ?
      GROUP BY u.id`,
      [userId]
    );

    newUser.roles = safeParseRoles(newUser.roles);

    res.status(201).json({
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
      [email]
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
      [email]
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
      { expiresIn: "8h" }
    );

    // Clear OTP
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
        roles,
      },
    });
  } catch (err) {
    console.error("verifyOTP error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
}
