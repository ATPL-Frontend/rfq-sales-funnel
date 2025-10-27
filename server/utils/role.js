// utils/role.js
export function normalizeRoles(raw) {
  if (raw == null) return ["user"];
  if (Array.isArray(raw)) return raw;
  const s = String(raw).trim();
  if (!s) return ["user"];
  // try JSON first
  if (s.startsWith("[") || s.startsWith("{")) {
    try { 
      const v = JSON.parse(s); 
      return Array.isArray(v) ? v : [String(v)];
    } catch {}
  }
  // fallback: comma/space separated string -> array
  return s.split(",").map(x => x.trim()).filter(Boolean);
}
