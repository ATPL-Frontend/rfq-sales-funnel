import AccessControl from "accesscontrol";
import { pool } from "../lib/dbconnect-mysql.js";

// Create one AccessControl instance globally
const ac = new AccessControl();

/**
 * ✅ Load all roles & permissions dynamically from the database
 * Populates AccessControl at runtime.
 */
export const loadAccessControlFromDB = async () => {
  try {
    const [rows] = await pool.query(`
      SELECT r.name AS role, p.action, p.resource
      FROM role_permissions rp
      JOIN roles r ON rp.role_id = r.id
      JOIN permissions p ON rp.permission_id = p.id
    `);

    // Clear old grants
    ac.reset();

    // If DB has records, use them
    if (rows.length > 0) {
      for (const row of rows) {
        if (!row.role || !row.action || !row.resource) continue;
        ac.grant(row.role)[row.action](row.resource);
      }
      console.log(`✅ AccessControl loaded from DB (${rows.length} grants)`);
      return;
    }

    // No records found — use default fallback
    console.warn("⚠️ No role-permission data found in DB — using default fallback grants.");
    defineFallbackRoles();
  } catch (err) {
    console.error("❌ Failed to load AccessControl from DB:", err.message);
    console.warn("⚠️ Falling back to static roles.");
    defineFallbackRoles();
  }
};

/**
 * 🧱 Define static fallback roles
 * Used when DB is empty or fails.
 */
function defineFallbackRoles() {
  // USER
  ac.grant("user")
    .readOwn("user")
    .updateOwn("user")
    .readOwn("rfq")
    .createOwn("rfq")
    .readOwn("customer")
    .readOwn("sales-funnel")
    .readOwn("invoice");

  // SALES-PERSON
  ac.grant("sales-person")
    .extend("user")
    .createAny("rfq")
    .readAny("rfq")
    .updateAny("rfq")
    .createAny("customer")
    .readAny("customer")
    .updateAny("customer")
    .createAny("sales-funnel")
    .readAny("sales-funnel")
    .updateAny("sales-funnel")
    .createAny("invoice")
    .readAny("invoice")
    .updateAny("invoice");

  // ADMIN
  ac.grant("admin")
    .extend("sales-person")
    .readAny("user")
    .updateAny("user")
    .deleteAny("rfq")
    .deleteAny("customer")
    .deleteAny("sales-funnel")
    .deleteAny("invoice");

  // SUPER-ADMIN (explicit CRUD for "all" resources)
  ac.grant("super-admin")
    .extend("admin")
    .createAny("all")
    .readAny("all")
    .updateAny("all")
    .deleteAny("all");

  console.log("✅ Default static AccessControl roles loaded");
}

// Export both the AccessControl instance and loader function
export { ac };
export default ac;
