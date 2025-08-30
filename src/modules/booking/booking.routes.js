const router = require('express').Router();
const controller = require('./booking.controller');
const { requireAuth } = require('../../middleware/auth');
const { requireRole } = require('../../lib/rbac/requireRole');


router.use(requireAuth);
router.use(requireRole(['owner', 'admin'])); // ممكن توسعها لاحقًا

// 📌 Client routes
router.get('/my', requireRole(['client']), controller.getMyBookings);
router.put('/:id/edit', requireRole(['client']), controller.updateBookingByClient);
router.delete('/:id/cancel', requireRole(['client']), controller.cancelBookingByClient);

// 📌 Common routes (مفتوحة للـ owner/admin فقط)
router.post('/', requireRole(['owner', 'admin']), controller.createBooking);
router.post('/book', requireRole(['client']), controller.createBooking);
router.post('/slots', controller.getAvailableSlots);
// 🧑‍💼 Routes for employees
router.get('/employee/my', requireRole(['employee']), controller.getEmployeeBookings);
router.put('/:id/edit-employee', requireRole(['employee']), controller.editBookingByEmployee);
router.delete('/:id/cancel-employee', requireRole(['employee']), controller.cancelBookingByEmployee);

// 📌 Admin/Owner routes
router.get('/salon', controller.getSalonBookings);
router.put('/:id/edit-admin', requireRole(['owner', 'admin']), controller.editBookingByAdmin);
router.delete('/:id/cancel-admin', requireRole(['owner', 'admin']), controller.cancelBookingByAdmin);

module.exports = router;
