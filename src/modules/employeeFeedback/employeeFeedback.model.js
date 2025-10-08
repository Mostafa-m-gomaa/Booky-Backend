const mongoose = require('mongoose');
const { Schema } = mongoose;

const EmployeeFeedbackSchema = new Schema({
  bookingId: { type: Schema.Types.ObjectId, ref: 'Booking', required: true },
  employeeId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  clientId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  rating: { type: Number, min: 1, max: 5, required: true },
  comment: { type: String },
  annonymous: { type: Boolean, default: false }
}, { timestamps: true });

EmployeeFeedbackSchema.index({ employeeId: 1 });

module.exports = mongoose.model('EmployeeFeedback', EmployeeFeedbackSchema);
