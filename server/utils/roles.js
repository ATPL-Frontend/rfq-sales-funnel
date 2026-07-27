import AccessControl from "accesscontrol";
import { pool } from "../lib/dbconnect-mysql.js";

// Create one AccessControl instance globally
const ac = new AccessControl();

/**
 * Load all roles and permissions dynamically from the database.
 */
export const loadAccessControlFromDB = async () => {
  try {
    const [rows] = await pool.query(`
      SELECT
        r.name AS role,
        p.action,
        p.resource
      FROM role_permissions rp
      JOIN roles r
        ON rp.role_id = r.id
      JOIN permissions p
        ON rp.permission_id = p.id
    `);

    // Clear previously loaded grants
    ac.reset();

    if (rows.length > 0) {
      for (const row of rows) {
        if (!row.role || !row.action || !row.resource) {
          continue;
        }

        const grant = ac.grant(row.role);

        switch (row.action) {
          case "createOwn":
            grant.createOwn(row.resource);
            break;

          case "createAny":
            grant.createAny(row.resource);
            break;

          case "readOwn":
            grant.readOwn(row.resource);
            break;

          case "readAny":
            grant.readAny(row.resource);
            break;

          case "updateOwn":
            grant.updateOwn(row.resource);
            break;

          case "updateAny":
            grant.updateAny(row.resource);
            break;

          case "deleteOwn":
            grant.deleteOwn(row.resource);
            break;

          case "deleteAny":
            grant.deleteAny(row.resource);
            break;

          default:
            console.warn(
              `Unknown permission action ignored: ${row.action}`,
            );
            break;
        }
      }

      console.log(
        `AccessControl loaded from DB (${rows.length} grants)`,
      );

      return;
    }

    console.warn(
      "No role-permission data found in DB. Using fallback grants.",
    );

    defineFallbackRoles();
  } catch (error) {
    console.error(
      "Failed to load AccessControl from DB:",
      error.message,
    );

    console.warn("Falling back to static roles.");

    ac.reset();
    defineFallbackRoles();
  }
};

/**
 * Static fallback roles.
 * Used only when database permissions are empty or unavailable.
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
    .readOwn("invoice")
    .readAny("buy-sale")
    .updateAny("buy-sale");

  // SALES PERSON
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
    .updateAny("invoice")

    // Buy-Sale
    .readAny("buy-sale");

  // ADMIN
  ac.grant("admin")
    .extend("sales-person")
    .readAny("user")
    .updateAny("user")
    .deleteAny("rfq")
    .deleteAny("customer")
    .deleteAny("sales-funnel")
    .deleteAny("invoice")

    // Buy-Sale
    .createAny("buy-sale")
    .readAny("buy-sale")
    .updateAny("buy-sale")
    .deleteAny("buy-sale");

  // SUPER ADMIN
  ac.grant("super-admin")
    .extend("admin")

    // Explicit permissions for existing resources
    .createAny("user")
    .readAny("user")
    .updateAny("user")
    .deleteAny("user")

    .createAny("rfq")
    .readAny("rfq")
    .updateAny("rfq")
    .deleteAny("rfq")

    .createAny("customer")
    .readAny("customer")
    .updateAny("customer")
    .deleteAny("customer")

    .createAny("sales-funnel")
    .readAny("sales-funnel")
    .updateAny("sales-funnel")
    .deleteAny("sales-funnel")

    .createAny("invoice")
    .readAny("invoice")
    .updateAny("invoice")
    .deleteAny("invoice")

    // Explicit Buy-Sale permissions
    .createAny("buy-sale")
    .readAny("buy-sale")
    .updateAny("buy-sale")
    .deleteAny("buy-sale");

  console.log("Default static AccessControl roles loaded");
}

export { ac };
export default ac;