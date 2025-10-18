const mongoose = require('mongoose');
const { Schema } = mongoose;

const NotificationSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },  // اللي هيروحله الـ notify
  type: { type: String, enum: ['booking_created', 'booking_cancelled', 'booking_completed', 'new_feedback'], required: true },  // نوع الإشعار
  title: { type: String, required: true },  // مثل "حجز جديد!"
  message: { type: String, required: true },  // "عميل حجز معاك يوم الإثنين"
  data: { type: Schema.Types.Mixed, default: {} },  // extra info زي { bookingId: '...' }
  isRead: { type: Boolean, default: false },
  sentVia: { type: String, enum: ['push', 'email', 'sms'], default: 'push' },  // إزاي أرسلناها
}, { timestamps: true });

NotificationSchema.index({ userId: 1, isRead: 1 });  // index للـ unread queries
NotificationSchema.index({ type: 1 });

module.exports = mongoose.model('Notification', NotificationSchema);