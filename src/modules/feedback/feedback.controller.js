const Feedback = require('./feedback.model');
const Booking = require('../booking/booking.model');
const { asyncHandler } = require('../../utils/asyncHandler');
const handlerFactory = require('../../utils/handlerFactory');

// ✅ إنشاء فيدباك بعد انتهاء الحجز
exports.createFeedback = asyncHandler(async (req, res) => {
  const { bookingId, rating, comment } = req.body;

  const booking = await Booking.findOne({ _id: bookingId, clientId: req.user.id });
  if (!booking) return res.status(404).json({ message: 'Booking not found or not yours' });

  if (booking.status !== 'completed') {
    return res.status(400).json({ message: 'You can only review completed bookings' });
  }

  const existing = await Feedback.findOne({ bookingId });
  if (existing) return res.status(400).json({ message: 'You already submitted feedback for this booking' });

  const feedback = await Feedback.create({
    bookingId,
    salonId: booking.salonId,
    clientId: req.user.id,
    rating,
    comment,
  });

  res.status(201).json(feedback);
});

// ✅ فيدباكات صالون واحد
exports.getSalonFeedbacks = asyncHandler(async (req, res) => {
  const salonId = req.user.salonId;
  const feedbacks = await Feedback.find({ salonId })
    .populate('clientId', 'name avatar')
    .sort({ createdAt: -1 });

  res.json(feedbacks);
});

// ✅ استخدام handlerFactory في باقي العمليات العامة
exports.getAllFeedbacks = handlerFactory.getAll(Feedback);
exports.getFeedback = handlerFactory.getOne(Feedback, 'clientId');
exports.updateFeedback = handlerFactory.updateOne(Feedback);
exports.deleteFeedback = handlerFactory.deleteOne(Feedback);
