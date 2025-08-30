const jwt = require('jsonwebtoken');
const { ENV } = require('../config/env');


function requireAuth(req, res, next) {
const header = req.headers.authorization;
if (!header || !header.startsWith('Bearer ')) {
return res.status(401).json({ message: 'Unauthorized' });
}
const token = header.slice(7);
try {
const payload = jwt.verify(token, ENV.JWT_ACCESS_SECRET);
req.user = payload;
next();
} catch (e) {
return res.status(401).json({ message: 'Invalid token' });
}
}


module.exports = { requireAuth };