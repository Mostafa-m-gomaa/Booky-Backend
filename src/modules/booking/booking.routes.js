const router = require('express').Router();
const controller = require('./booking.controller');
const { requireAuth } = require('../../middleware/auth');
const { requireRole } = require('../../lib/rbac/requireRole');


router.use(requireAuth);
// router.use(requireRole(['owner', 'admin'])); // ممكن توسعها لاحقًا

// 📌 Client routes
router.get('/my', requireRole(['client']), controller.getMyBookings);
router.put('/:id/edit', requireRole(['client']), controller.updateBookingByClient);
router.delete('/:id/cancel', requireRole(['client']), controller.cancelBookingByClient);
router.post('/book',requireRole(['client']), controller.createBooking);

// 📌 Common routes (مفتوحة للـ owner/admin فقط)
router.post('/', requireRole(['owner', 'admin']), controller.createBooking);
router.post('/book', requireRole(['client']), controller.createBooking);
router.post('/slots', controller.getAvailableSlots);
// 🧑‍💼 Routes for employees
router.get('/employee/my', requireRole(['barber']), controller.getEmployeeBookings);
router.put('/:id/edit-employee', requireRole(['barber']), controller.editBookingByEmployee);
router.delete('/:id/cancel-employee', requireRole(['barber']), controller.cancelBookingByEmployee);
router.post('/create-employee',requireRole(['barber','specialist']), controller.createBookingByEmployee);
// ✅ جديد: وسم No-Show / Completed
router.post('/:id/no-show',requireRole(['barber','specialist','owner','admin']), controller.markNoShow);
router.post('/:id/complete',requireRole(['barber','specialist','owner','admin']), controller.markCompleted);


// 📌 Admin/Owner routes
router.get('/salon', controller.getSalonBookings);
router.put('/:id/edit-admin', requireRole(['owner', 'admin']), controller.editBookingByAdmin);
router.delete('/:id/cancel-admin', requireRole(['owner', 'admin']), controller.cancelBookingByAdmin);
router.post('/',controller.createBooking);     // إنشاء نيابة عن Walk-in
router.post('/slots',controller.getAvailableSlots);
router.get('/salon',controller.getSalonBookings);
router.put('/:id/edit-admin',controller.editBookingByAdmin);
router.delete('/:id/cancel-admin',controller.cancelBookingByAdmin);


module.exports = router;
