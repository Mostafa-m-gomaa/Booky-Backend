const mongoose = require('mongoose');
const { Schema } = mongoose;

const ServiceSchema = new Schema({
  name: { type: String, required: true },
  description: String,
  price: { type: Number, required: true },
  priceAfterDiscount: Number,
  images: [String] ,
  durationMin: { type: Number, required: true },
  salonId: { type: Schema.Types.ObjectId, ref: 'Salon', required: true },
  employees: [{ type: Schema.Types.ObjectId, ref: 'Employee' }],
  categoryId: { type: Schema.Types.ObjectId, ref: 'Category' , required: true },

  image: String,
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

ServiceSchema.index({ salonId: 1 });

module.exports = mongoose.model('Service', ServiceSchema);
