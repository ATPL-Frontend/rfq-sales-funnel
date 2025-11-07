import jwt from "jsonwebtoken";
import ac from "../utils/roles.js";

/**
 * ✅ Authenticate Middleware
 * Verifies JWT and attaches decoded user info to req.user
 */
export function authenticate(req, res, next) {
  try {
    const authHeader = (req.headers.authorization || "").trim();
    if (!authHeader) {
      res.setHeader("WWW-Authenticate", 'Bearer realm="api"');
      return res.status(401).json({ message: "Missing Authorization header" });
    }

    const [scheme, token] = authHeader.split(/\s+/);
    if (!/^Bearer$/i.test(scheme) || !token) {
      res.setHeader("WWW-Authenticate", 'Bearer error="invalid_request"');
      return res.status(401).json({ message: "Invalid Authorization header format" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    console.error("Auth error:", err.message);
    return res.status(401).json({ message: "Invalid or expired token" });
  }
}

/**
 * ✅ Authorize Middleware (with Super-Admin bypass)
 * Checks AccessControl permissions based on role/action/resource.
 */
export function authorize(action, resource) {
  return (req, res, next) => {
    try {
      // Extract role
      const role = Array.isArray(req.user?.role)
        ? req.user.role[0]
        : req.user?.role;

      if (!role) {
        return res.status(403).json({ message: "Missing role in token" });
      }

      // 🟢 Super-Admin Bypass
      if (role === "super-admin") {
        return next(); // always allow
      }

      // Check permission via AccessControl
      const permission = ac.can(role)[action](resource);
      if (!permission.granted) {
        return res.status(403).json({
          message: `Forbidden: ${role} cannot ${action} on ${resource}`,
        });
      }

      next();
    } catch (err) {
      console.error("Authorization error:", err);
      return res.status(500).json({ message: "Internal authorization error" });
    }
  };
}
