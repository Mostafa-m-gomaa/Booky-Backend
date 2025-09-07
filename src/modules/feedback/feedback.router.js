// const router = require('express').Router();
// const { requireAuth } = require('../../middleware/auth');
// const { requireRole } = require('../../lib/rbac/requireRole');
// const controller = require('./feedback.controller');

// // العميل يضيف تقييم بعد انتهاء الحجز
// router.post('/', requireAuth, requireRole(['client']), controller.createFeedback);

// // الصالون أو الأدمن يعرض التقييمات الخاصة بصالونه
// router.get('/my-salon', requireAuth, requireRole(['owner', 'admin']), controller.getSalonFeedbacks);

// // السوبر أدمن يقدر يجيب كل التقييمات (اختياري)
// router.get('/', requireAuth, requireRole(['super-admin']), controller.getAllFeedbacks);

// module.exports = router;

const router = require('express').Router();
const controller = require('./feedback.controller');
const { requireAuth } = require('../../middleware/auth');
const { requireRole } = require('../../lib/rbac/requireRole');

// 🛡️ الحماية: لازم يكون مسجل دخول
router.use(requireAuth);

// 💬 العميل يعمل فيدباك بعد الحجز
router.post('/', controller.createFeedback);

// 🧾 عرض كل الفيدباكات للـ admin أو super-admin
router.get('/all', requireRole(['super-admin', 'admin']), controller.getAllFeedbacks);

// 🧾 فيدباكات الصالون الحالي
router.get('/salon', requireRole(['owner', 'admin']), controller.getSalonFeedbacks);

// ✏️ تفاصيل، تعديل، حذف
router
  .route('/:id')
  .get(controller.getFeedback)
  .put(requireRole(['super-admin', 'admin']), controller.updateFeedback)
  .delete(requireRole(['super-admin', 'admin']), controller.deleteFeedback);

module.exports = router;
