const Notification = require('./notification.model');
const { asyncHandler } = require('../../utils/asyncHandler');
const User = require('../users/user.model');


// ✅ إرسال notify لـ user معيّن (push + fallback)
exports.sendNotification = async function(userId, type, title, message, data = {}) {
  const user = await User.findById(userId).select('phone email role');
  if (!user || !user.isActive) return;
  // 1. احفظ في DB
  const notification = await Notification.create({
    userId,
    type,
    title,
    message,
    data,
  });
  if (user.role === 'client' || user.role === 'barber') {  // مثلاً
    // await sendEmail(user.email, title, message);  // implement حسبك
    // await sendSMS(user.phone, message);
  }

  return notification;
}

// ✅ جلب unread notifications للـ user
exports.getUnreadNotifications = asyncHandler(async (req, res) => {
  const notifications = await Notification.find({ userId: req.user._id, isRead: false })
    .sort({ createdAt: -1 })
    .limit(150)
    .populate('data.bookingId', 'startTime service');  // populate لو عايز details

  res.json({ notifications, count: notifications.length });
});

// ✅ جلب كل notifications (مع pagination)
exports.getNotifications = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 150;
  const skip = (page - 1) * limit;

  const notifications = await Notification.find({ userId: req.user._id })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .populate('data.bookingId', 'startTime service');

  const total = await Notification.countDocuments({ userId: req.user._id });

  res.json({
    notifications,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) }
  });
});

// ✅ Mark as read
exports.markAsRead = asyncHandler(async (req, res) => {
  const { notificationId } = req.params;

  const notification = await Notification.findOneAndUpdate(
    { _id: notificationId, userId: req.user._id },
    { isRead: true },
    { new: true }
  );

  if (!notification) {
    return res.status(404).json({ message: 'Notification not found' });
  }

  res.json({ success: true, notification });
});

// ✅ Mark all as read
exports.markAllAsRead = asyncHandler(async (req, res) => {
  const result = await Notification.updateMany(
    { userId: req.user._id, isRead: false },
    { isRead: true }
  );

  res.json({ success: true, updated: result.modifiedCount });
});

