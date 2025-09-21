// src/modules/coupons/coupon.routes.js
const router = require('express').Router();
const ctrl = require('./coupon.controller');
const { requireRole } = require('../../lib/rbac/requireRole');
const { requireAuth } = require('../../middleware/auth');

router.use(requireAuth); // يبني req.user

// إنشاء
router.post('/',
  requireRole(['super-admin','owner','admin']),
  ctrl.createCoupon);

// تعديل/تفعيل
router.patch('/:id', requireRole(['super-admin','owner','admin']), ctrl.updateCoupon);
router.patch('/:id/toggle', requireRole(['super-admin','owner','admin']), ctrl.toggleCoupon);

// عرض/تحقق
router.get('/', requireRole(['super-admin','owner','admin']), ctrl.listCoupons);
router.post('/validate', ctrl.validateCoupon); // ممكن تخليها public عشان الـ app يتحقق قبل الدفع

module.exports = router;
