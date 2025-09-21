const router = require('express').Router();
const { requireAuth } = require('../../middleware/auth');
const { requireRole } = require('../../lib/rbac/requireRole');
const upload = require('../../middleware/upload');
const controller = require('./salon.controller');

// ───────────── Public routes (بدون تسجيل دخول) ─────────────
// كل الصالونات (فلترة/سورتينج/باجينج عبر الكويري)
router.get('/', controller.getAllSalons);

// تفاصيل كاملة لصالون واحد (موظفين + تقييماتهم + الكاتيجوريز + الخدمات + ريفيوهات الصالون)
router.get('/:id/details', controller.getSalonDetails);

// صالون واحد (بيانات أساسية) باستخدام الهاندلر فاكتوري
router.get('/:id', controller.getOneSalon);

// ───────────── Protected routes (للمالك) ─────────────
router.use(requireAuth);

// صالوناتي أنا (المالك)
router.get('/owner/my', requireRole(['owner']), controller.getMySalons);

// إنشاء صالون جديد (مالك فقط)
router.post(
  '/',
  requireRole(['owner','super-admin']),
  upload.array('images', 10),
  controller.createSalon
);

// تعديل صالون (مالك فقط)
router.put(
  '/:id',
  requireRole(['owner','super-admin']),
  upload.array('images', 10),
  controller.updateSalon
);

// حذف صالون (مالك فقط)
router.delete(
  '/:id',
  requireRole(['owner',"super-admin"]),
  controller.deleteSalon
);

router.post('/:id/toggle-active', requireRole(['superadmin']), controller.toggleSalonActive);

module.exports = router;
