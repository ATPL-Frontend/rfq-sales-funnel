import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { pool } from "../lib/dbconnect-mysql.js";
import { sendMail } from "../utils/email.js";
import { normalizeRoles } from "../utils/role.js";

// const cookieOpts = {
//   httpOnly: true,
//   secure: process.env.NODE_ENV === "production", // true on HTTPS
//   sameSite: "lax", // or "strict"; use "none" if cross-site
//   maxAge: 2 * 60 * 60 * 1000, // 2 hours
//   // domain: ".atpldhaka.com",                   // uncomment if using subdomains
//   path: "/", // cookie valid for whole site
// };

const generateOTP = () =>
  Math.floor(100000 + Math.random() * 900000).toString();

export async function register(req, res) {
  const { name, email, password, short_form, role = ["user"] } = req.body;
  const errors = {};

  if (!name) errors.name = "Name is required";
  if (!email) errors.email = "Email is required";
  if (!password) errors.password = "Password is required";
  if (!short_form) errors.short_form = "Short form is required";

  let normalizedRole = "user";

  try {
    normalizedRole = normalizeRoles(role);
  } catch (e) {
    errors.role = e.message;
  }

  if (Object.keys(errors).length > 0) {
    return res.status(400).json({
      success: false,
      message: "Missing required fields",
      errors: errors,
    });
  }

  const hashed = await bcrypt.hash(password, 10);
  try {
    await pool.query(
      "INSERT INTO users (name, email, short_form, password, role) VALUES (?, ?, ?, ?, JSON_ARRAY(?))",
      [name, email, short_form, hashed, normalizedRole]
    );
    res.status(201).json({ success: true, message: "User registered" });
  } catch (err) {
    if (err && err.code === "ER_DUP_ENTRY") {
      return res
        .status(409)
        .json({ success: false, message: "Email already exists" });
    }
    res.status(500).json({ success: false, message: err.message });
  }
}

export async function login(req, res) {
  const { email, password } = req.body;
  const [rows] = await pool.query("SELECT * FROM users WHERE email=?", [email]);
  if (rows.length === 0)
    return res.status(400).json({ success: false, message: "User not found" });

  const user = rows[0];
  const valid = await bcrypt.compare(password, user.password);
  if (!valid)
    return res
      .status(401)
      .json({ success: false, message: "Invalid password" });

  // Step 1: Send OTP
  const otp = generateOTP();
  const expiry = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes
  await pool.query("UPDATE users SET otp_code=?, otp_expires=? WHERE id=?", [
    otp,
    expiry,
    user.id,
  ]);

  await sendMail(
    user.email,
    "Your Login OTP",
    `<p>Hello ${user.name},</p><p>Your OTP is <b>${otp}</b>. It expires in 5 minutes.</p>`
  );

  res.json({ success: true, message: "OTP sent to email" });
}

export async function verifyOTP(req, res) {
  const { email, otp } = req.body || {};
  if (!email || !otp)
    return res
      .status(400)
      .json({ success: false, message: "Email and OTP are required" });

  const [rows] = await pool.query("SELECT * FROM users WHERE email=?", [
    email.trim().toLowerCase(),
  ]);
  if (rows.length === 0)
    return res.status(404).json({ success: false, message: "User not found" });

  const user = rows[0];

  const ok =
    user.otp_code &&
    String(user.otp_code) === String(otp) &&
    user.otp_expires &&
    new Date(user.otp_expires) > new Date();
  if (!ok)
    return res
      .status(400)
      .json({ success: false, message: "Invalid or expired OTP" });

  const role = normalizeRoles(user.role);

  const token = jwt.sign(
    { id: user.id, email: user.email, role },
    process.env.JWT_SECRET,
    { expiresIn: "24h" }
  );

  await pool.query(
    "UPDATE users SET otp_code=NULL, otp_expires=NULL, token=? WHERE id=?",
    [token, user.id]
  );

  // 🔐 Set cookie
  // res.cookie("access_token", token, cookieOpts);

  res.json({
    success: true,
    message: "Logged in",
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role,
    },
  });
}
