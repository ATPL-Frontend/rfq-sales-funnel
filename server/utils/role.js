const ALLOWED_ROLES = new Set(["admin", "super-admin", "sales-person", "user"]);

export function normalizeRoles(input) {
  if (input == null) return "sales-person";

  let value = input;

  if (typeof value === "string") {
    // Could be a raw string OR a JSON stringified array
    const trimmed = value.trim();
    if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
      try {
        const parsed = JSON.parse(trimmed);
        value = parsed;
      } catch {
        // fall through; treat as plain string
        value = trimmed;
      }
    } else {
      value = trimmed;
    }
  }

  if (Array.isArray(value)) {
    if (value.length !== 1) {
      throw new Error("Only one role is allowed.");
    }
    value = String(value[0]).trim();
  }

  const role = String(value).toLowerCase();
  if (!ALLOWED_ROLES.has(role)) {
    throw new Error(
      "Invalid role. Must be one of: admin, super-admin, sales-person, user."
    );
  }
  return role;
}
