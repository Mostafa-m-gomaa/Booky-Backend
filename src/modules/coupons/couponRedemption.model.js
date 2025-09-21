// src/modules/coupons/couponRedemption.model.js
const mongoose = require('mongoose');
const { Schema } = mongoose;

const CouponRedemptionSchema = new Schema({
  couponId:  { type: Schema.Types.ObjectId, ref: 'Coupon', required: true },
  bookingId: { type: Schema.Types.ObjectId, ref: 'Booking', required: true },
  clientId:  { type: Schema.Types.ObjectId, ref: 'User' },
  clientPhone: String,
  salonId:   { type: Schema.Types.ObjectId, ref: 'Salon', required: true },
  discount:  { type: Number, required: true }
}, { timestamps: true });

CouponRedemptionSchema.index({ couponId: 1 });
CouponRedemptionSchema.index({ salonId: 1 });
CouponRedemptionSchema.index({ clientId: 1, couponId: 1 });
CouponRedemptionSchema.index({ clientPhone: 1, couponId: 1 });

module.exports = mongoose.model('CouponRedemption', CouponRedemptionSchema);
