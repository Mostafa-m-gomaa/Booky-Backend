const mongoose = require('mongoose');
const { Schema } = mongoose;

const OpeningHourSchema = new Schema({
  day: { type: String, enum: ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'], required: true },
  start: { type: String, required: true }, // hh:mm
  end: { type: String, required: true }
}, { _id: false });

const SalonSchema = new Schema({
  name: { type: String, required: true },
  area: { type: String, required: true },
  slotDuration: { type: Number, default: 10 }, // minutes
  ownerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  type: { type: String, enum: ['men', 'women', 'both']},
  address: { type: String },
  phone: { type: String },
  location: {
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number], default: [0, 0] } // [lng, lat]
  },
  openingHours: [OpeningHourSchema],
  images: [String],
  isActive: { type: Boolean, default: false },
}, { timestamps: true });

SalonSchema.index({ location: '2dsphere' });

module.exports = mongoose.model('Salon', SalonSchema);
