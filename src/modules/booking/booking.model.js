// const mongoose = require('mongoose');

// const bookingSchema = new mongoose.Schema({
//   clientName: { type: String, required: true },
//   clientPhone: { type: String },
//   clientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
//   salonId: { type: mongoose.Schema.Types.ObjectId, ref: 'Salon', required: true },
//   services: [
//     {
//       serviceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Service', required: true },
//       employeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
//       start: { type: Date, required: true },
//       end: { type: Date, required: true },
//       price: { type: Number, required: true } // ✅ السعر لكل خدمة
//     }
//   ],
//   totalDuration: { type: Number }, // يحسب تلقائيًا
//   totalPrice: { type: Number, required: true }, // ✅ السعر الكلي للحجز
//   date: { type: Date, required: true },
//   status: { type: String, enum: ['pending', 'confirmed', 'canceled'], default: 'pending' },
//   createdAt: { type: Date, default: Date.now }
// });

// module.exports = mongoose.model('Booking', bookingSchema);

const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
  clientName: { type: String, required: true },
  clientPhone: { type: String },
  clientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

  salonId: { type: mongoose.Schema.Types.ObjectId, ref: 'Salon', required: true },

  services: [{
    serviceId:  { type: mongoose.Schema.Types.ObjectId, ref: 'Service', required: true },
    employeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    start:      { type: Date, required: true },
    end:        { type: Date, required: true },
    price:      { type: Number, required: true } // السعر لكل خدمة
  }],

  totalDuration: { type: Number },              // يُحسب في الكنترولر
  totalPrice:    { type: Number, required: true },

  date: { type: Date, required: true },         // تاريخ اليوم (startOf('day'))

  // ✅ حالات متوافقة مع الكنترولرز
  status: {
    type: String,
    enum: ['scheduled','rescheduled','cancelled','completed','no-show'],
    default: 'scheduled'
  },

  // ✅ حقول إضافية يستخدمها الكنترولر
  cancelReason: { type: String },
  editReason:   { type: String },
  completedAt:  { type: Date }
}, {
  timestamps: true // createdAt, updatedAt
});

// ✅ إندكسات مفيدة للاستعلام
bookingSchema.index({ salonId: 1, date: 1 });
bookingSchema.index({ 'services.employeeId': 1, date: 1 });
bookingSchema.index({ clientId: 1, date: 1 });
bookingSchema.index({ status: 1 });

module.exports = mongoose.model('Booking', bookingSchema);
