const router = require('express').Router();
const controller = require('./booking.controller');
const { requireAuth } = require('../../middleware/auth');
const { requireRole } = require('../../lib/rbac/requireRole');


// router.use(requireAuth);
// router.use(requireRole(['owner', 'admin'])); // ممكن توسعها لاحقًا

// 📌 Client routes
router.get('/my', requireRole(['client']), 
(req, res, next) => {
  req.objFilter = { clientId: req.user._id };
  next();
}
,controller.getBookings);


router.get('/client/:clientId', requireRole(['owner', 'admin', 'super-admin', 'barber']), 
(req, res, next) => {
  req.objFilter = { clientId: req.params.clientId };
  next();
}
,controller.getBookings);

router.put('/:id/edit', requireRole(['client']), controller.updateBookingByClient);

router.delete('/:id/cancel', requireRole(['client']), controller.cancelBookingByClient);
// router.post('/book',requireRole(['client']), controller.createBooking);
router.post('/book', controller.createBooking);

// 📌 Common routes (مفتوحة للـ owner/admin فقط)
router.post('/', requireRole(['owner', 'admin']), controller.createBooking);

router.post('/slots', controller.getAvailableSlots);
// 🧑‍💼 Routes for employees
router.get('/employee/my', requireRole(['barber']), 
(req, res, next) => {
  req.objFilter = { employeeId: req.user._id };
  next();
}, controller.getBookings);

router.delete('/:id/cancel-employee', requireRole(['barber']), controller.cancelBookingByEmployee);
router.post('/create-employee',requireRole(['barber','specialist']), controller.createBookingByEmployee);
// ✅ جديد: وسم No-Show / Completed
router.post('/:id/no-show',requireRole(['barber','owner','admin' ,'super-admin']), controller.markNoShow);
router.post('/:id/complete',requireRole(['barber','owner','admin' ,'super-admin']), controller.markCompleted);


// 📌 Admin/Owner routes
router.get('/salon/:salonId', 
  requireRole(['owner', 'admin', 'super-admin' , 'barber']),
  (req, res, next) => {
    req.objFilter = { salonId: req.params.salonId };
    next();
  }, controller.getBookings);
router.put('/:id/edit-admin', requireRole(['owner', 'admin', 'super-admin']), controller.editBookingByAdmin);
router.delete('/:id/cancel-admin', requireRole(['owner', 'admin', 'super-admin']), controller.cancelBookingByAdmin);
router.get(
  '/reports/clients/:salonId',
  requireRole(['owner', 'admin', 'super-admin']),
  controller.getClientsBookingsSummary
);

router.post('/',controller.createBooking);     // إنشاء نيابة عن Walk-in
router.post('/slots',controller.getAvailableSlots);
router.put('/:id/edit-admin',controller.editBookingByAdmin);
router.delete('/:id/cancel-admin',controller.cancelBookingByAdmin);


module.exports = router;
