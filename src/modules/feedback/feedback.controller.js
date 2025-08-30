const Feedback = require('./feedback.model');
const Booking = require('../booking/booking.model');
const { asyncHandler } = require('../../utils/asyncHandler');

exports.createFeedback = asyncHandler(async (req, res) => {
  const { bookingId, rating, comment } = req.body;

  const booking = await Booking.findOne({ _id: bookingId, clientId: req.user.id });
  if (!booking) return res.status(404).json({ message: 'Booking not found or not yours' });

  if (booking.status !== 'completed') {
    return res.status(400).json({ message: 'You can only review completed bookings' });
  }

  // Check if already reviewed
  const existing = await Feedback.findOne({ bookingId });
  if (existing) return res.status(400).json({ message: 'You already submitted feedback for this booking' });

  const feedback = await Feedback.create({
    bookingId,
    salonId: booking.salonId,
    clientId: req.user.id,
    rating,
    comment
  });

  res.status(201).json(feedback);
});


exports.getSalonFeedbacks = asyncHandler(async (req, res) => {
  const salonId = req.user.salonId;
  const feedbacks = await Feedback.find({ salonId }).populate('clientId', 'name avatar').sort({ createdAt: -1 });
  res.json(feedbacks);
});

exports.getAllFeedbacks = asyncHandler(async (req, res) => {
  const feedbacks = await Feedback.find().populate('clientId', 'name avatar').sort({ createdAt: -1 });
  res.json(feedbacks);
});
