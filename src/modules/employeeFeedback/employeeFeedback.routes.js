// const router = require('express').Router();
// const { requireAuth } = require('../../middleware/auth');
// const { requireRole } = require('../../lib/rbac/requireRole');
// const controller = require('./employeeFeedback.controller');

// // العميل يضيف تقييمات بعد الحجز
// router.post('/', requireAuth, requireRole(['client']), controller.addEmployeeFeedback);

// // أي حد يقدر يشوف تقييمات موظف معين (أو خليه فقط owner/admin لو عايز)
// router.get('/:employeeId', requireAuth, controller.getFeedbacksForEmployee);

// module.exports = router;


const router = require('express').Router();
const controller = require('./employeeFeedback.controller');
const { requireAuth } = require('../../middleware/auth');

// لازم المستخدم يكون عامل لوجين علشان يضيف تقييم
router.use(requireAuth);

router.post('/', controller.addEmployeeFeedback);

// عرض كل التقييمات (تقدر تبعت query param زي ?employeeId=123)
router.get('/', controller.getAllFeedbacks);

// اختيارية: لو عايز راوت مخصص لكل موظف
router.get('/employee/:employeeId', controller.getFeedbacksForEmployee);

module.exports = router;
