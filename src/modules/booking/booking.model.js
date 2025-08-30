const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
  clientName: { type: String, required: true },
  clientPhone: { type: String },
  clientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  salonId: { type: mongoose.Schema.Types.ObjectId, ref: 'Salon', required: true },
  services: [
    {
      serviceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Service', required: true },
      employeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
      start: { type: Date, required: true },
      end: { type: Date, required: true },
      price: { type: Number, required: true } // ✅ السعر لكل خدمة
    }
  ],
  totalDuration: { type: Number }, // يحسب تلقائيًا
  totalPrice: { type: Number, required: true }, // ✅ السعر الكلي للحجز
  date: { type: Date, required: true },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Booking', bookingSchema);
