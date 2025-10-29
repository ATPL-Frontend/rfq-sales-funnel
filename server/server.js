import cookieParser from "cookie-parser";
import cors from "cors";
import "dotenv/config";
import express from "express";
import rateLimit from "express-rate-limit";
import morgan from "morgan";

import { connectDB } from "./lib/dbconnect-mysql.js";

// Table initializers (ensure these exist as we wrote earlier)
import { createCustomerTable } from "./models/customer.model.js";
import { createRFQPreparedPeopleTable, createRFQTable } from "./models/rfq.model.js";
import { createSalesFunnelTable } from "./models/salesFunnel.model.js";
import { createUserTable } from "./models/user.model.js";

// Routers
import authRoutes from "./routes/auth.routes.js";
import userRoutes from "./routes/user.routes.js";
import customerRoutes from "./routes/customer.routes.js";
import rfqRoutes from "./routes/rfq.routes.js";
import salesFunnelRoutes from "./routes/salesFunnel.routes.js";

const app = express();
const PORT = process.env.PORT || 5000;

/* ---------- Security, CORS, parsers, logging ---------- */
app.set("trust proxy", 1); // for rate limit & cookies behind proxy
app.use(
  cors({
    origin: process.env.CLIENT_URL || true,
    credentials: true,
  })
);
app.use(express.json({ limit: "1mb" }));
app.use(cookieParser());
app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));

// Rate-limit auth endpoints (helps against OTP/JWT abuse)
const authLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 100, // 100 requests per IP / 10 min
  standardHeaders: true,
  legacyHeaders: false,
});
app.use("/api/auth", authLimiter);

/* ------------------- Health check --------------------- */
app.get("/api/alive", (_req, res) => res.json({ message: "Server is alive" }));

/* -------------------- API Routes ---------------------- */
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/customers", customerRoutes);
app.use("/api/rfqs", rfqRoutes);
app.use("/api/sales-funnels", salesFunnelRoutes);

/* ----------------- 404 + Error handlers --------------- */
app.use((req, res, next) => {
  if (req.path.startsWith("/api/")) {
    return res.status(404).json({ message: "API route not found" });
  }
  return res.status(404).send("Not found");
});

// Centralized error handler (so thrown errors don’t crash the app)
app.use((err, _req, res, _next) => {
  console.error("Unhandled error:", err);
  res.status(err.status || 500).json({
    message:
      process.env.NODE_ENV === "production"
        ? "Something went wrong"
        : err.message,
  });
});

/* --------------------- Startup ------------------------ */
(async () => {
  try {
    await connectDB();

    // Ensure tables exist (idempotent)
    await createUserTable();
    await createCustomerTable();
    await createRFQTable();
    await createRFQPreparedPeopleTable();
    await createSalesFunnelTable();

    app.listen(PORT, () =>
      console.log(`🚀 Server running on http://localhost:${PORT}`)
    );
  } catch (e) {
    console.error("Startup failure:", e);
    process.exit(1);
  }
})();
