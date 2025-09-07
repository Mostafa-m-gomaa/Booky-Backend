const router = require('express').Router();
const controller = require('./feedback.controller');
const { requireAuth } = require('../../middleware/auth');
const { requireRole } = require('../../lib/rbac/requireRole');



// 💬 العميل يعمل فيدباك بعد الحجز
router.post('/', controller.createFeedback);

// 🧾 عرض كل الفيدباكات للـ admin أو super-admin
router.get('/all',  controller.getAllFeedbacks);

// 🧾 فيدباكات الصالون الحالي
router.get('/salon', controller.getSalonFeedbacks);

// ✏️ تفاصيل، تعديل، حذف
router
  .route('/:id')
  .get(controller.getFeedback)
  .put(requireRole(['super-admin', 'admin']), controller.updateFeedback)
  .delete(requireRole(['super-admin', 'admin']), controller.deleteFeedback);

module.exports = router;
