const EmployeeFeedback = require('./employeeFeedback.model');
const Booking = require('../booking/booking.model');
const { asyncHandler } = require('../../utils/asyncHandler');
const handlerFactory = require('../../utils/handlerFactory');
const ApiError = require('../../utils/apiError');

exports.authorizeFeedbackOwner = async (req, res, next) => {
  try {
    const { feedbackId } = req.params;
    const feedback = await EmployeeFeedback.findById(feedbackId).select('client'); // أو الحقل اللي بيخزن اليوزر
    if (!feedback) {
      return next(new ApiError(`No feedback for id ${feedbackId}`, 404));
    }

    // req.user._id ممكن يكون ObjectId، فا نستخدم equals أو toString
    if (feedback.client && feedback.client.equals && feedback.client.equals(req.user._id)) {
      // المالك فعلاً
      return next();
    }

    return next(new ApiError('You are not allowed to delete this feedback', 403));
  } catch (err) {
    return next(err);
  }
}
// ✅ مخصص: إضافة تقييم للموظف
exports.addEmployeeFeedback = asyncHandler(async (req, res) => {
  const { bookingId, employeeId , rating , comment , annonymous } = req.body;

  const booking = await Booking.findOne({ _id: bookingId, clientId: req.user._id });
  if (!booking || booking.status !== 'completed') {
    return res.status(400).json({ message: 'You can only review completed bookings' });
  }

  const existing = await EmployeeFeedback.findOne({ bookingId, clientId: req.user._id });
  if (existing) return res.status(400).json({ message: 'You already submitted feedback for this booking' });

  const savedFeedback = await EmployeeFeedback.create({
    bookingId,
    clientId: req.user._id,
    employeeId,
    rating,
    comment,
    annonymous: annonymous || false
  });

  res.status(201).json(savedFeedback);
});

exports.getAllFeedbacks = handlerFactory.getAll(EmployeeFeedback);
exports.deleteFeedback = handlerFactory.deleteOne(EmployeeFeedback);
exports.updateFeedback = handlerFactory.updateOne(EmployeeFeedback);

