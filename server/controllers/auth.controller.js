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


export async function login(req, res) {
  try {
    const { email, password } = req.body;

    // Validate credentials
    if (
      typeof email !== "string" ||
      !email.trim() ||
      typeof password !== "string" ||
      !password
    ) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
    }

    // Find user with roles
    const [rows] = await pool.query(
      `SELECT u.*, JSON_ARRAYAGG(r.name) AS roles
       FROM users u
       LEFT JOIN user_roles ur ON ur.user_id = u.id
       LEFT JOIN roles r ON r.id = ur.role_id
       WHERE u.email = ?
       GROUP BY u.id`,
      [email.trim()]
    );

    if (!rows.length) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    const user = rows[0];

    // Verify password
    const valid = await bcrypt.compare(password, user.password);

    if (!valid) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    // Parse roles
    const roles = safeParseRoles(user.roles);

    /*
    // ===================================
    // OTP FUNCTIONALITY DISABLED
    // ===================================

    const otp = generateOTP();
    const expiry = new Date(
      Date.now() + 5 * 60 * 1000
    ).toISOString();

    await pool.query(
      "UPDATE users SET otp_code=?, otp_expires=? WHERE id=?",
      [otp, expiry, user.id]
    );

    await sendMail(
      user.email,
      "Your RFQ Login OTP",
      `<p>Hello ${user.name},</p>
       <p>Your One-Time Password (OTP) is:</p>
       <h2>${otp}</h2>
       <p>This code will expire in <b>5 minutes</b>.</p>`
    );

    return res.json({
      success: true,
      message: "OTP sent to your email address",
      email: user.email,
    });
    */

    // ===================================
    // DIRECT LOGIN - NO OTP REQUIRED
    // ===================================

    if (!process.env.JWT_SECRET) {
      throw new Error("JWT_SECRET is not configured");
    }

    // Generate JWT immediately
    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        roles,
      },
      process.env.JWT_SECRET,
      { expiresIn: "8h" }
    );

    // Save token and clear any old OTP
    await pool.query(
      `UPDATE users
       SET otp_code = NULL,
           otp_expires = NULL,
           token = ?
       WHERE id = ?`,
      [token, user.id]
    );

    console.log(`✅ Login successful: ${user.email}`);

    // Return login response
    return res.json({
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
    console.error("Login error:", err);

    return res.status(500).json({
      success: false,
      message: "Login failed. Please try again.",
    });
  }
}


/**
 * 🔢 Step 2 — Verify OTP and return JWT
 */
// OTP verification disabled.
// Direct login is now handled by login().

export async function verifyOTP(req, res) {
  return res.status(410).json({
    success: false,
    message: "OTP verification is disabled. Please log in directly.",
  });
}