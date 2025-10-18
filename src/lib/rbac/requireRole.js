function requireRole(allowed) {
  return (req, res, next) => {
    const user = req.user; // تم حقنه من requireAuth
    if (!user) return res.status(401).json({ message: "you must login first" });
    if (!allowed.includes(user.role))
      return res
        .status(403)
        .json({ message: "you are not authorized to access this api " });
    next();
  };
}

module.exports = { requireRole };
