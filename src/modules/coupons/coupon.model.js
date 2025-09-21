// src/modules/coupons/coupon.model.js
const mongoose = require('mongoose');
const { Schema } = mongoose;

const CouponSchema = new Schema({
  code: { type: String, required: true, uppercase: true, trim: true, unique: true },

  // نوع الخصم
  type: { type: String, enum: ['percent', 'fixed'], required: true }, // percent=%
  value: { type: Number, required: true, min: 0 },                     // 10 => 10% أو 10 جنيه

  maxDiscount: { type: Number, default: null }, // اختيارى: سقف الخصم للـ percent
  minOrder:    { type: Number, default: 0 },    // حد أدنى للإجمالي عشان الكوبون يشتغل

  // النطاق
  global:   { type: Boolean, default: false },            // true => كل المحلات
  salons:   [{ type: Schema.Types.ObjectId, ref: 'Salon'}], // لو global=false يبقى لازم تحدد صالونات

  // الصلاحية
  active:  { type: Boolean, default: true },
  startsAt:{ type: Date, default: () => new Date() },
  endsAt:  { type: Date },

  // حدود الاستخدام
  usageLimit:      { type: Number, default: null }, // إجمالي كل الناس
  usedCount:       { type: Number, default: 0 },
  perUserLimit:    { type: Number, default: 1 },    // لكل يوزر/موبايل

  // تتبّع
  createdBy:   { type: Schema.Types.ObjectId, ref: 'User' },
  creatorRole: { type: String, enum: ['super-admin','owner','admin'] },
}, { timestamps: true });

CouponSchema.index({ code: 1 });
CouponSchema.index({ active: 1, startsAt: 1, endsAt: 1 });

module.exports = mongoose.model('Coupon', CouponSchema);
