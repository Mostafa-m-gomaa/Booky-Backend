// const EmployeeFeedback = require('./employeeFeedback.model');
// const Booking = require('../booking/booking.model');
// const { asyncHandler } = require('../../utils/asyncHandler');

// exports.addEmployeeFeedback = asyncHandler(async (req, res) => {
//   const { bookingId, feedbacks } = req.body; // feedbacks = [{ employeeId, rating, comment }]

//   const booking = await Booking.findOne({ _id: bookingId, clientId: req.user.id });
//   if (!booking || booking.status !== 'completed') {
//     return res.status(400).json({ message: 'You can only review completed bookings' });
//   }

//   const existing = await EmployeeFeedback.findOne({ bookingId, clientId: req.user.id });
//   if (existing) return res.status(400).json({ message: 'You already submitted feedback for this booking' });

//   const savedFeedbacks = await EmployeeFeedback.insertMany(
//     feedbacks.map(f => ({
//       bookingId,
//       clientId: req.user.id,
//       employeeId: f.employeeId,
//       rating: f.rating,
//       comment: f.comment,
//     }))
//   );

//   res.status(201).json(savedFeedbacks);
// });

// exports.getFeedbacksForEmployee = asyncHandler(async (req, res) => {
//   const employeeId = req.params.employeeId;
//   const feedbacks = await EmployeeFeedback.find({ employeeId }).populate('clientId', 'name avatar');
//   res.json(feedbacks);
// });
const EmployeeFeedback = require('./employeeFeedback.model');
const Booking = require('../booking/booking.model');
const { asyncHandler } = require('../../utils/asyncHandler');
const handlerFactory = require('../../utils/handlerFactory');

// ✅ مخصص: إضافة تقييم للموظف
exports.addEmployeeFeedback = asyncHandler(async (req, res) => {
  const { bookingId, feedbacks } = req.body;

  const booking = await Booking.findOne({ _id: bookingId, clientId: req.user.id });
  if (!booking || booking.status !== 'completed') {
    return res.status(400).json({ message: 'You can only review completed bookings' });
  }

  const existing = await EmployeeFeedback.findOne({ bookingId, clientId: req.user.id });
  if (existing) return res.status(400).json({ message: 'You already submitted feedback for this booking' });

  const savedFeedbacks = await EmployeeFeedback.insertMany(
    feedbacks.map(f => ({
      bookingId,
      clientId: req.user.id,
      employeeId: f.employeeId,
      rating: f.rating,
      comment: f.comment,
    }))
  );

  res.status(201).json(savedFeedbacks);
});

// ✅ جينيريك: جميع التقييمات (مع دعم فلترة employeeId عبر query param)
// exports.createEmployeeFeddBack = handlerFactory.createOne(EmployeeFeedback);

exports.getAllFeedbacks = handlerFactory.getAll(EmployeeFeedback);

// ✅ اختياري: لو عايز راوت خاص يعرض تقييمات موظف محدد
exports.getFeedbacksForEmployee = asyncHandler(async (req, res) => {
  const feedbacks = await EmployeeFeedback.find({ employeeId: req.params.employeeId }).populate('clientId', 'name avatar');
  res.json(feedbacks);
});
