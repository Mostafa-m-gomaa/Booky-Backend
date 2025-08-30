const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../users/user.model');
const { signAccessToken, signRefreshToken, setRefreshCookie, clearRefreshCookie } = require('./auth.service');
const { ENV } = require('../../config/env');
const { asyncHandler } = require('../../utils/asyncHandler');


const register = asyncHandler(async (req, res) => {
const { name, phone, password, role = 'client', salonId } = req.body;
if (!name || !phone || !password) return res.status(400).json({ message: 'name/phone/password required' });


const exists = await User.findOne({ phone });
if (exists) return res.status(409).json({ message: 'Phone already in use' });


const passwordHash = await bcrypt.hash(password, 10);
const user = await User.create({ name, phone, passwordHash, role, salonId });


const at = signAccessToken(user);
const rt = signRefreshToken(user);
setRefreshCookie(res, rt);


res.status(201).json({ accessToken: at, user: { id: user._id, name: user.name, phone: user.phone, role: user.role, salonId: user.salonId } });
});


const login = asyncHandler(async (req, res) => {
const { phone, password } = req.body;
const user = await User.findOne({ phone });
if (!user) return res.status(401).json({ message: 'Invalid credentials' });
const ok = await bcrypt.compare(password, user.passwordHash);
if (!ok) return res.status(401).json({ message: 'Invalid credentials' });
if (!user.isActive) return res.status(403).json({ message: 'User inactive' });


const at = signAccessToken(user);
const rt = signRefreshToken(user);
setRefreshCookie(res, rt);
res.json({ accessToken: at, user: { id: user._id, name: user.name, phone: user.phone, role: user.role, salonId: user.salonId } });
});


const me = asyncHandler(async (req, res) => {
res.json({ user: req.user });
});


const refresh = asyncHandler(async (req, res) => {
const token = req.cookies?.rt;
if (!token) return res.status(401).json({ message: 'No refresh token' });
try {
const payload = jwt.verify(token, ENV.JWT_REFRESH_SECRET);
const user = await User.findById(payload.id);
if (!user) return res.status(401).json({ message: 'Invalid refresh token' });
if (user.tokenVersion !== payload.tokenVersion) return res.status(401).json({ message: 'Refresh token revoked' });
const at = signAccessToken(user);
const rt = signRefreshToken(user);
setRefreshCookie(res, rt);
res.json({ accessToken: at });
} catch (e) {
return res.status(401).json({ message: 'Invalid refresh token' });
}
});


const logout = asyncHandler(async (req, res) => {
// نقدر نزود خيار: زيادة tokenVersion لإلغاء كل الـ sessions
clearRefreshCookie(res);
res.json({ ok: true });
});


module.exports = { register, login, me, refresh, logout };