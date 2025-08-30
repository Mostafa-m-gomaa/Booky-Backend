const router = require('express').Router();
const { requireAuth } = require('../../middleware/auth');
const { requireRole } = require('../../lib/rbac/requireRole');
const controller = require('./employeeFeedback.controller');

// العميل يضيف تقييمات بعد الحجز
router.post('/', requireAuth, requireRole(['client']), controller.addEmployeeFeedback);

// أي حد يقدر يشوف تقييمات موظف معين (أو خليه فقط owner/admin لو عايز)
router.get('/:employeeId', requireAuth, controller.getFeedbacksForEmployee);

module.exports = router;
