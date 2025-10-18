
const mongoose = require('mongoose');
const { Schema } = mongoose;

const FeedbackSchema = new Schema({
  bookingId: { type: Schema.Types.ObjectId, ref: 'Booking', required: true },
  salonId: { type: Schema.Types.ObjectId, ref: 'Salon', required: true },
  clientId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  rating: { type: Number, required: true, min: 1, max: 5 },
  comment: { type: String },
  images: [{  // ✅ جديد: array للصور فقط (paths المخزّنة)
    type: String,  // مثل '/uploads/feedbacks/images/image1.jpg'
    required: false
  }],
  videos: [{  // ✅ جديد: array للفيديوهات فقط (paths المخزّنة)
    type: String,  // مثل '/uploads/feedbacks/videos/video1.mp4'
    required: false
  }],
  replies: [{  // زي ما هو: array للـ replies
    text: { type: String, required: true },
    repliedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },  // الـ admin أو salon owner
    repliedAt: { type: Date, default: Date.now }
  }],
  createdAt: { type: Date, default: Date.now }
});

FeedbackSchema.index({ salonId: 1 });
FeedbackSchema.index({ 'replies.repliedBy': 1 });  // index للـ replies عشان الاستعلامات

module.exports = mongoose.model('Feedback', FeedbackSchema);