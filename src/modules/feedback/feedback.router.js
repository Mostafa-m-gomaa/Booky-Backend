const router = require('express').Router();
const { requireAuth } = require('../../middleware/auth');
const { requireRole } = require('../../lib/rbac/requireRole');
const controller = require('./feedback.controller');

// العميل يضيف تقييم بعد انتهاء الحجز
router.post('/', requireAuth, requireRole(['client']), controller.createFeedback);

// الصالون أو الأدمن يعرض التقييمات الخاصة بصالونه
router.get('/my-salon', requireAuth, requireRole(['owner', 'admin']), controller.getSalonFeedbacks);

// السوبر أدمن يقدر يجيب كل التقييمات (اختياري)
router.get('/', requireAuth, requireRole(['super-admin']), controller.getAllFeedbacks);

module.exports = router;
