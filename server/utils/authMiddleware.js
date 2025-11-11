import jwt from "jsonwebtoken";
import ac from "../utils/roles.js"; // AccessControl permissions

/**
 * ✅ Authenticate Middleware
 * Verifies JWT and attaches decoded user info to req.user
 */
export function authenticate(req, res, next) {
  try {
    // 1️⃣ Get token from Authorization header
    const authHeader = (req.headers.authorization || "").trim();
    if (!authHeader) {
      res.setHeader("WWW-Authenticate", 'Bearer realm="api"');
      return res.status(401).json({ message: "Missing Authorization header" });
    }

    const [scheme, token] = authHeader.split(/\s+/);
    if (!/^Bearer$/i.test(scheme) || !token) {
      res.setHeader("WWW-Authenticate", 'Bearer error="invalid_request"');
      return res
        .status(401)
        .json({ message: "Invalid Authorization header format" });
    }

    // 2️⃣ Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // decoded contains { id, email, role, ... }
    req.user = decoded;

    next();
  } catch (err) {
    console.error("Auth error:", err.message);
    return res.status(401).json({ message: "Invalid or expired token" });
  }
}

/**
 * ✅ Authorize Middleware (AccessControl)
 * Checks if user's role has permission to perform an action on a resource
 * @param {string} action - CRUD action (createOwn, readAny, updateOwn, etc.)
 * @param {string} resource - resource name (e.g. 'rfq', 'customer', 'user')
 */
export function authorize(action, resource) {
  return (req, res, next) => {
    try {
      const roles = Array.isArray(req.user?.role)
        ? req.user.role[0] // use first role if array
        : req.user?.role
        ? [req.user.role]
        : [];

      if (!roles.length) {
        return res.status(403).json({ message: "Missing role in token" });
      }

      // allow if ANY role grants the permission
      const granted = roles.some((r) => ac.can(r)[action](resource).granted);

      if (!granted) {
        return res.status(403).json({
          message: `Forbidden: ${roles.join(
            ", "
          )} cannot ${action} on ${resource}`,
        });
      }

      next();
    } catch (err) {
      console.error("Authorization error:", err);
      return res.status(500).json({ message: "Internal authorization error" });
    }
  };
}