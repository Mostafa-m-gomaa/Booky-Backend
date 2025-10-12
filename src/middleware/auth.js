const jwt = require("jsonwebtoken");
const { ENV } = require("../config/env");
const User = require("../modules/users/user.model");
const { requireRole } = require("../lib/rbac/requireRole");

async function requireAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    return res.status(401).json({ message: "authentication required" });
  }
  const token = header.slice(7);
  try {
    const payload = jwt.verify(token, ENV.JWT_ACCESS_SECRET);

    const currentUser = await User.findById(payload.userId);
    req.user = currentUser;
    next();
  } catch (e) {
    return res.status(401).json({ message: "Invalid token" });
  }
}

module.exports = { requireAuth };
