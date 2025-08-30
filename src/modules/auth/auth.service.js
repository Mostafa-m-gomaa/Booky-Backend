const jwt = require('jsonwebtoken');
const { ENV } = require('../../config/env');


function signAccessToken(user) {
return jwt.sign(
{ id: user._id.toString(), role: user.role, salonId: user.salonId, tokenVersion: user.tokenVersion },
ENV.JWT_ACCESS_SECRET,
{ expiresIn: ENV.JWT_ACCESS_EXPIRES }
);
}


function signRefreshToken(user) {
return jwt.sign(
{ id: user._id.toString(), tokenVersion: user.tokenVersion },
ENV.JWT_REFRESH_SECRET,
{ expiresIn: ENV.JWT_REFRESH_EXPIRES }
);
}


function setRefreshCookie(res, token) {
res.cookie('rt', token, {
httpOnly: true,
sameSite: 'lax',
secure: false, // غيّرها true في الإنتاج مع HTTPS
domain: ENV.COOKIE_DOMAIN,
path: '/api/v1/auth'
});
}


function clearRefreshCookie(res) {
res.clearCookie('rt', { path: '/api/v1/auth', domain: ENV.COOKIE_DOMAIN });
}


module.exports = { signAccessToken, signRefreshToken, setRefreshCookie, clearRefreshCookie };