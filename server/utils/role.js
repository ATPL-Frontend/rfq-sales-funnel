export const ALLOWED_ROLES = new Set(["admin", "super-admin", "sales-person", "user"]);

/** Normalize roles into an array of canonical roles. */
export function normalizeRoleList(input) {
  if (input == null) return ["sales-person"]; // default one role

  let value = input;

  // If it's a string, it might be a JSON array or a comma list or a single value
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

  // Now coerce to an array
  const arr = Array.isArray(value) ? value : [value];

  // Clean, lowercase, dedupe, and validate
  const out = [];
  for (const r of arr) {
    const v = String(r || "").trim().toLowerCase();
    if (!v) continue;
    if (!ALLOWED_ROLES.has(v)) {
      throw new Error("Invalid role. Must be one of: admin, super-admin, sales-person, user.");
    }
    if (!out.includes(v)) out.push(v);
  }

  // ensure at least one role
  if (out.length === 0) out.push("sales-person");
  return out;
}
