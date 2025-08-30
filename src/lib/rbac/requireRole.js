function requireRole(allowed) {
return (req, res, next) => {
const user = req.user; // تم حقنه من requireAuth
if (!user) return res.status(401).json({ message: 'Unauthorized' });
if (!allowed.includes(user.role)) return res.status(403).json({ message: 'Forbidden' });
next();
};
}


module.exports = { requireRole };