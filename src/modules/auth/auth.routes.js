const router = require('express').Router();
const cookieParser = require('cookie-parser');
const { register, login, me, refresh, logout } = require('./auth.controller');
const { requireAuth } = require('../../middleware/auth');


// cookie parser محلي للمسارات دي
router.use(cookieParser());


router.post('/register', register);
router.post('/login', login);
router.post('/refresh', refresh);
router.post('/logout', requireAuth, logout);
router.get('/me', requireAuth, me);


module.exports = router;