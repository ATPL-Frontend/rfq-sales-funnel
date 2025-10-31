import jwt from "jsonwebtoken";

// export const cookieOpts = {
//   httpOnly: true,
//   secure: process.env.NODE_ENV === "production", // requires HTTPS in prod
//   sameSite: "strict", // "lax" also fine for same-origin
//   path: "/",
//   maxAge: 24 * 60 * 60 * 1000, // 24h
//   // domain: ".atpldhaka.com",                    // only if you want cross-subdomain
// };

export function authenticate(req, res, next) {
  // 1) Prefer HttpOnly cookie
  // let token = req.cookies?.access_token;
  const auth = (req.headers.authorization || "").trim();

  if (!auth) {
    res.setHeader("WWW-Authenticate", 'Bearer realm="api"');
    return res.status(401).json({ message: "Missing Authorization header" });
  }

  const [scheme, token] = auth.split(/\s+/);

  if (!/^Bearer$/i.test(scheme) || !token) {
    res.setHeader("WWW-Authenticate", 'Bearer error="invalid_request"');
    return res.status(401).json({ message: "Invalid Authorization header format" });
  }

  // 2) Fallback: Authorization header (Bearer)
  // if (!token) {
  //   const header = req.headers.authorization || "";
  //   if (header.startsWith("Bearer ")) {
  //     token = header.slice(7);
  //   }
  // }

  // if (!token) {
  //   return res.status(401).json({ message: "No token provided" });
  // }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    return next();
  } catch (e) {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
}

export function authorize(...roles) {
  return (req, res, next) => {
    const userRolesRaw = req.user?.role ?? [];
    // tolerate string or JSON string in req.user.role
    const userRoles = Array.isArray(userRolesRaw)
      ? userRolesRaw
      : String(userRolesRaw)
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean);

    const allowed = roles.some((r) => userRoles.includes(r));
    if (!allowed) return res.status(403).json({ message: "Forbidden" });
    next();
  };
}
