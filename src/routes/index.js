const router = require('express').Router();


router.use('/auth', require('../modules/auth/auth.routes'));
router.use('/users', require('../modules/users/user.routes'));
router.use('/salons', require('../modules/salons/salon.routes'));
router.use('/services', require('../modules/services/service.routes'));
router.use('/bookings', require('../modules/booking/booking.routes'));
router.use('/categories', require('../modules/service-category/category.routes'));
router.use('/feedback', require('../modules/feedback/feedback.router'));
router.use('/employee-feedback', require('../modules/employeeFeedback/employeeFeedback.routes'));
router.use('/coupons', require('../modules/coupons/coupon.routes'));


module.exports = router;