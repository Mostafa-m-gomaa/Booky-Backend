// src/modules/coupons/coupon.controller.js
const Coupon = require('./coupon.model');
const CouponRedemption = require('./couponRedemption.model');
const Salon = require('../salons/salon.model');
const User  = require('../users/user.model');
const { asyncHandler } = require('../../utils/asyncHandler');
const handlerFactory = require('../../utils/handlerFactory');
const mongoose = require('mongoose');
const dayjs = require('dayjs');



function ensureSalonScope(req, salons) {
  // super-admin: كله مسموح
  if (req.user.role === 'super-admin') return salons;

  if (!Array.isArray(salons) || salons.length === 0) {
    const e = new Error('salons is required'); e.status = 400; throw e;
  }

  if (req.user.role === 'owner') {
    // لازم يملك كل الصالونات المذكورة
    return salons;
  }

  if (req.user.role === 'admin') {
    // admin: صالونه فقط
    const ok = salons.every(s => String(s) === String(req.user.salonId));
    if (!ok) { const e = new Error('Admin can only create coupon for his salon'); e.status = 403; throw e; }
    return salons;
  }

  const e = new Error('Not allowed'); e.status = 403; throw e;
}

// POST /coupons
exports.createCoupon = asyncHandler(async (req, res) => {
  const { code, type, value, maxDiscount, minOrder, global, salons = [], startsAt, endsAt, usageLimit, perUserLimit = 1 } = req.body;

  if (!code || !type || value == null) {
    return res.status(400).json({ message: 'code, type, value required' });
  }

  let salonsFinal = [];
  if (req.user.role === 'super-admin') {
    salonsFinal = global ? [] : salons;
  } else {
    if (global) return res.status(403).json({ message: 'Only super-admin can create global coupons' });
    salonsFinal = ensureSalonScope(req, salons);
  }

  // لو owner: تأكد فعلاً يملك الصالونات
  if (req.user.role === 'owner') {
    const count = await Salon.countDocuments({ _id: { $in: salonsFinal }, ownerId: req.user._id });
    if (count !== salonsFinal.length) return res.status(403).json({ message: 'You must own all salons' });
  }

  const doc = await Coupon.create({
    code: String(code).toUpperCase(),
    type,
    value,
    maxDiscount: maxDiscount ?? null,
    minOrder: minOrder ?? 0,
    global: !!global,
    salons: salonsFinal,
    active: true,
    startsAt: startsAt ? new Date(startsAt) : new Date(),
    endsAt: endsAt ? new Date(endsAt) : undefined,
    usageLimit: usageLimit ?? null,
    perUserLimit,
    createdBy: req.user._id,
    creatorRole: req.user.role
  });

  res.status(201).json(doc);
});

// PATCH /coupons/:id   (تعديل عام)
exports.updateCoupon = asyncHandler(async (req, res) => {
  const coupon = await Coupon.findById(req.params.id);
  if (!coupon) return res.status(404).json({ message: 'Coupon not found' });

  // السماح بالتعديل حسب الدور
  if (req.user.role === 'super-admin') {
    // كله مسموح
  } else if (req.user.role === 'owner') {
    const count = await Salon.countDocuments({ _id: { $in: (coupon.global ? req.body.salons || [] : coupon.salons) }, ownerId: req.user._id });
    if (!coupon.global && count !== (coupon.salons || []).length) {
      return res.status(403).json({ message: 'You can edit only coupons of your salons' });
    }
    if (req.body.global) return res.status(403).json({ message: 'Owner cannot set global' });
  } else if (req.user.role === 'admin') {
    const onlyMine = !coupon.global && coupon.salons.every(s => String(s) === String(req.user.salonId));
    if (!onlyMine) return res.status(403).json({ message: 'Admin can edit only his salon coupons' });
    if (req.body.global) return res.status(403).json({ message: 'Admin cannot set global' });
    if (req.body.salons && !req.body.salons.every(s => String(s) === String(req.user.salonId))) {
      return res.status(403).json({ message: 'Admin can use his salon only' });
    }
  } else {
    return res.status(403).json({ message: 'Not allowed' });
  }

  const allowed = ['code','type','value','maxDiscount','minOrder','active','startsAt','endsAt','usageLimit','perUserLimit','global','salons'];
  for (const k of Object.keys(req.body)) if (allowed.includes(k)) coupon[k] = req.body[k];

  await coupon.save();
  res.json(coupon);
});

// PATCH /coupons/:id/toggle
exports.toggleCoupon = asyncHandler(async (req, res) => {
  const coupon = await Coupon.findById(req.params.id);
  if (!coupon) return res.status(404).json({ message: 'Coupon not found' });
  // تحقق صلاحيات نفس منطق update
  if (req.user.role === 'super-admin') { /* ok */ }
  else if (req.user.role === 'owner') {
    if (coupon.global) return res.status(403).json({ message: 'Owner cannot toggle global coupon' });
    const count = await Salon.countDocuments({ _id: { $in: coupon.salons }, ownerId: req.user._id });
    if (count !== coupon.salons.length) return res.status(403).json({ message: 'Not allowed' });
  } else if (req.user.role === 'admin') {
    const ok = !coupon.global && coupon.salons.every(s => String(s) === String(req.user.salonId));
    if (!ok) return res.status(403).json({ message: 'Not allowed' });
  } else return res.status(403).json({ message: 'Not allowed' });

  coupon.active = !!req.body.active;
  await coupon.save();
  res.json({ ok: true, active: coupon.active });
});

// GET /coupons (فلترة حسب الصالون أو الكود)
// exports.listCoupons = asyncHandler(async (req, res) => {
//   const { salonId, code } = req.query;
//   const q = {};
//   if (code) q.code = String(code).toUpperCase();
//   if (salonId) q.$or = [{ global: true }, { salons: new mongoose.Types.ObjectId(String(salonId)) }];
//   res.json(await Coupon.find(q).sort({ createdAt: -1 }));
// });

exports.listCoupons = handlerFactory.getAll(Coupon);
// POST /coupons/validate  { salonId, clientId?, clientPhone?, total, code }
exports.validateCoupon = asyncHandler(async (req, res) => {
  const { salonId, code, total, clientId, clientPhone } = req.body;
  if (!salonId || !code || total == null) return res.status(400).json({ message: 'salonId, code, total required' });

  const coupon = await Coupon.findOne({ code: String(code).toUpperCase() });
  const now = new Date();

  if (!coupon || !coupon.active) return res.status(400).json({ message: 'Invalid coupon' });
  if (coupon.startsAt && now < coupon.startsAt) return res.status(400).json({ message: 'Coupon not started yet' });
  if (coupon.endsAt && now > coupon.endsAt) return res.status(400).json({ message: 'Coupon expired' });
  if (!coupon.global && !coupon.salons.some(s => String(s) === String(salonId))) {
    return res.status(400).json({ message: 'Coupon not valid for this salon' });
  }
  if (coupon.usageLimit != null && coupon.usedCount >= coupon.usageLimit) {
    return res.status(400).json({ message: 'Coupon usage limit reached' });
  }
  if (total < (coupon.minOrder || 0)) {
    return res.status(400).json({ message: `Minimum order is ${coupon.minOrder}` });
  }

  // per-user limit
  if (coupon.perUserLimit && (clientId || clientPhone)) {
    const userFilter = clientId ? { clientId } : { clientPhone };
    const usedByUser = await CouponRedemption.countDocuments({ couponId: coupon._id, ...userFilter });
    if (usedByUser >= coupon.perUserLimit) {
      return res.status(400).json({ message: 'User limit reached for this coupon' });
    }
  }

  // حساب الخصم
  let discount = coupon.type === 'percent' ? (total * coupon.value) / 100 : coupon.value;
  if (coupon.maxDiscount != null) discount = Math.min(discount, coupon.maxDiscount);
  discount = Math.min(discount, total); // ماينفعش ينزل عن صفر

  res.json({
    ok: true,
    coupon: { id: coupon._id, code: coupon.code, type: coupon.type, value: coupon.value, maxDiscount: coupon.maxDiscount },
    discount,
    totalAfter: total - discount
  });
});
