const router = require('express').Router();
const cookieParser = require('cookie-parser');
const { register, login, me, refresh, logout ,resendOtp ,verifyOtp } = require('./auth.controller');
const { requireAuth } = require('../../middleware/auth');


// cookie parser محلي للمسارات دي
router.use(cookieParser());


router.post('/register', register);
router.post('/login', login);
router.post('/refresh', refresh);
router.post('/logout', requireAuth, logout);
router.get('/me', requireAuth, me);
router.post('/resend-otp', resendOtp);
router.post('/verify-otp', verifyOtp);

module.exports = router;