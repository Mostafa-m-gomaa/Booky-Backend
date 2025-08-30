// models/Feedback.js
const mongoose = require('mongoose');
const { Schema } = mongoose;

const FeedbackSchema = new Schema({
  bookingId: { type: Schema.Types.ObjectId, ref: 'Booking', required: true },
  salonId: { type: Schema.Types.ObjectId, ref: 'Salon', required: true },
  clientId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  rating: { type: Number, required: true, min: 1, max: 5 },
  comment: { type: String },
  createdAt: { type: Date, default: Date.now }
});

FeedbackSchema.index({ salonId: 1 });

module.exports = mongoose.model('Feedback', FeedbackSchema);
