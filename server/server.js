import cookieParser from "cookie-parser";
import cors from "cors";
import "dotenv/config";
import express from "express";
import rateLimit from "express-rate-limit";
import morgan from "morgan";
import bcrypt from "bcrypt";

import { connectDB, pool } from "./lib/dbconnect-mysql.js";

// ===============================
// 🧱 Table Initializers
// ===============================
import { createCustomerTable } from "./models/customer.model.js";
import {
  createRFQPreparedPeopleTable,
  createRFQTable,
} from "./models/rfq.model.js";
import { createSalesFunnelTable } from "./models/salesFunnel.model.js";
import { createUserTable } from "./models/user.model.js";
import { createInvoiceTable } from "./models/invoice.model.js";

// 🆕 Role-Permission Models
import {
  createRolePermissionTables,
  seedDefaultRolesAndPermissions,
} from "./models/rolePermission.model.js";

// 🆕 AccessControl Loader
import { loadAccessControlFromDB } from "./utils/roles.js";

// ===============================
// 🚦 Routers
// ===============================
import authRoutes from "./routes/auth.routes.js";
import userRoutes from "./routes/user.routes.js";
import customerRoutes from "./routes/customer.routes.js";
import rfqRoutes from "./routes/rfq.routes.js";
import salesFunnelRoutes from "./routes/salesFunnel.routes.js";
import invoiceRoutes from "./routes/invoice.routes.js";

// 🆕 NEW: Role & Permission routes
import rolePermissionRoutes from "./routes/rolePermission.routes.js";

// ===============================
// ⚙️ Express App Configuration
// ===============================
const app = express();
const PORT = process.env.PORT || 5050;

app.set("trust proxy", 1);

// ✅ CORS Configuration
const allowlist = [
  process.env.CLIENT_URL,
  "http://localhost:3000",
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "http://localhost:8080",
];
app.use(
  cors({
    origin(origin, cb) {
      if (!origin) return cb(null, true); // allow Postman / server-to-server
      if (allowlist.includes(origin)) return cb(null, true);
      return cb(new Error(`Not allowed by CORS: ${origin}`));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use(express.json({ limit: "1mb" }));
app.use(cookieParser());
app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));

// ✅ Rate Limit for Auth routes
const authLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 100, // 100 requests per IP
  standardHeaders: true,
  legacyHeaders: false,
});
app.use("/api/auth", authLimiter);

// ===============================
// 🩺 Health Check
// ===============================
app.get("/api/alive", (_req, res) =>
  res.json({ message: "Server is alive and healthy 🚀" })
);

// ===============================
// 🧭 API Routes
// ===============================
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/customers", customerRoutes);
app.use("/api/rfqs", rfqRoutes);
app.use("/api/sales-funnels", salesFunnelRoutes);
app.use("/api/invoices", invoiceRoutes);

// 🆕 Add Role & Permission management APIs
app.use("/api", rolePermissionRoutes);

// ===============================
// 🚨 404 & Error Handlers
// ===============================
app.use((req, res) => {
  if (req.path.startsWith("/api/")) {
    return res.status(404).json({ message: "API route not found" });
  }
  return res.status(404).send("Not found");
});

app.use((err, _req, res, _next) => {
  console.error("Unhandled error:", err);
  res.status(err.status || 500).json({
    message:
      process.env.NODE_ENV === "production"
        ? "Something went wrong"
        : err.message,
  });
});

// ===============================
// 👑 Auto-create Super Admin
// ===============================
async function ensureSuperAdmin() {
  const email = "frahman@ampec.com.au";
  const name = "Fayezur Rahman";
  const short_form = "FR";
  const password = "12345678";

  try {
    const [existing] = await pool.query(
      "SELECT id FROM users WHERE email = ?",
      [email]
    );
    if (existing.length > 0) {
      console.log("👑 Super-admin already exists — skipping creation.");
      return;
    }

    // Find or create super-admin role
    let [roles] = await pool.query("SELECT id FROM roles WHERE name = ?", [
      "super-admin",
    ]);
    if (roles.length === 0) {
      console.warn("⚠️ Super-admin role not found, seeding roles first...");
      await seedDefaultRolesAndPermissions();
      [roles] = await pool.query("SELECT id FROM roles WHERE name = ?", [
        "super-admin",
      ]);
    }

    const roleId = roles[0]?.id;
    if (!roleId)
      throw new Error("Super-admin role still not found after seeding!");

    const hashed = await bcrypt.hash(password, 10);
    await pool.query(
      "INSERT INTO users (name, email, short_form, password, role_id) VALUES (?, ?, ?, ?, ?)",
      [name, email, short_form, hashed, roleId]
    );

    console.log(`✅ Super-admin created: ${email} / ${password}`);
  } catch (err) {
    console.error("❌ Failed to ensure super-admin:", err.message);
  }
}

// ===============================
// 🚀 Startup Process
// ===============================
(async () => {
  try {
    console.log("🔌 Connecting to MySQL...");
    await connectDB();

    // ✅ Step 1: Create role/permission tables first
    console.log("🧩 Ensuring role & permission tables exist...");
    await createRolePermissionTables();
    await seedDefaultRolesAndPermissions();

    // ✅ Step 2: Create application tables
    console.log("🧱 Ensuring base tables exist...");
    await createUserTable();
    await createCustomerTable();
    await createRFQTable();
    await createRFQPreparedPeopleTable();
    await createSalesFunnelTable();
    await createInvoiceTable();

    // ✅ Step 3: Ensure super-admin exists
    await ensureSuperAdmin();

    // ✅ Step 4: Load AccessControl
    try {
      console.log("🔐 Loading AccessControl rules from DB...");
      await loadAccessControlFromDB();
    } catch (err) {
      console.warn(
        "⚠️ Failed to load AccessControl, continuing anyway:",
        err.message
      );
    }

    // ✅ Step 5: Start the server
    app.listen(PORT, () =>
      console.log(`✅ Server running at: http://localhost:${PORT}`)
    );

    // ✅ Graceful shutdown
    process.on("SIGINT", () => {
      console.log("\n🛑 Server shutting down gracefully...");
      process.exit(0);
    });
  } catch (err) {
    console.error("❌ Startup failure:", err);
    process.exit(1);
  }
})();
