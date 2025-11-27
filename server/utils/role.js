import ac from "./roles.js";


// Allowed role names
export const ALLOWED_ROLES = new Set([
  "admin",
  "super-admin",
  "sales-person",
  "user"
]);

/**
 * Normalize any roles input into an array.
 */
export function normalizeRoleList(input) {
  if (!input) return ["user"];

  let value = input;

  if (typeof value === "string") {
    const trimmed = value.trim();

    if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
      try {
        value = JSON.parse(trimmed);
      } catch {
        value = trimmed;
      }
    } else if (trimmed.includes(",")) {
      value = trimmed.split(",").map(s => s.trim()).filter(Boolean);
    } else {
      value = trimmed;
    }
  }

  const arr = Array.isArray(value) ? value : [value];
  const out = [];

  for (const r of arr) {
    const v = String(r).trim().toLowerCase();
    if (!ALLOWED_ROLES.has(v)) {
      throw new Error(
        "Invalid role. Must be one of: admin, super-admin, sales-person, user."
      );
    }
    if (!out.includes(v)) out.push(v);
  }

  return out.length ? out : ["user"];
}

/**
 * Safe parser for DB roles.
 */
export function safeParseRoles(raw) {
  if (!raw) return [];

  if (Array.isArray(raw)) return raw.map(String);

  raw = String(raw).trim();

  if (raw.startsWith("[") && raw.endsWith("]")) {
    try {
      return JSON.parse(raw).map(String);
    } catch {}
  }

  return raw.split(",").map(r => r.trim()).filter(Boolean);
}

/**
 * Standard AccessControl permission check.
 */
export function checkPermission(roles, action, resource) {
  for (const role of roles) {
    if (ac.can(role)[action](resource).granted) return true;
  }
  return false;
}

/**
 * Extract roles from req.user
 */
export function getUserRoles(req) {
  return Array.isArray(req.user?.roles)
    ? req.user.roles
    : [req.user?.roles || "user"];
}

/**
 * Main helper for controllers
 */
export function hasPermission(req, actions, resource) {
  const roles = getUserRoles(req);
  const actionsArray = Array.isArray(actions) ? actions : [actions];

  return actionsArray.some(action =>
    checkPermission(roles, action, resource)
  );
}

/**
 * EXPRESS MIDDLEWARE VERSION
 * Usage:
 *    router.get("/customers/:id",
 *      authorize(["readAny", "readOwn"], "customer"),
 *      getCustomerById
 *    );
 */
export function authorize(actions, resource) {
  const actionsArray = Array.isArray(actions) ? actions : [actions];

  return (req, res, next) => {
    const roles = getUserRoles(req);
    const has = actionsArray.some(action =>
      checkPermission(roles, action, resource)
    );

    if (!has) {
      return res.status(403).json({
        success: false,
        message: "Forbidden: insufficient permissions",
      });
    }

    next();
  };
}
