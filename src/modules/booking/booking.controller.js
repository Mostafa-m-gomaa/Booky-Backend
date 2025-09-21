


const Booking = require('./booking.model');
const Service = require('../services/service.model');
const User = require('../users/user.model');
const { asyncHandler } = require('../../utils/asyncHandler');
const dayjs = require('dayjs');
const { sendBookingNotification } = require('../../utils/notifications');
const Coupon = require('../coupons/coupon.model');
const CouponRedemption = require('../coupons/couponRedemption.model');

// helpers
function dayKeyOf(dateISO) {
  const m = dayjs(dateISO); // 0=Sun..6=Sat
  return ['sun','mon','tue','wed','thu','fri','sat'][m.day()];
}

function parseHM(dateISO, hm) { // "HH:mm" -> dayjs
  return dayjs(`${dayjs(dateISO).format('YYYY-MM-DD')} ${hm}`);
}

function employeeShiftsForDate(emp, dateISO) {
  const key = dayKeyOf(dateISO);
  const shifts = emp?.employeeData?.weeklySchedule?.[key] || [];

  // fallback للقديم لو مافيهوش weeklySchedule
  if (!shifts.length && emp?.employeeData?.startTime && emp?.employeeData?.endTime) {
    return [{ start: parseHM(dateISO, emp.employeeData.startTime), end: parseHM(dateISO, emp.employeeData.endTime) }];
  }

  return shifts.map(s => ({ start: parseHM(dateISO, s.start), end: parseHM(dateISO, s.end) }));
}

function employeeBlockIntervalsForDate(emp, dateISO) {
  const d = dayjs(dateISO);
  const ymd = d.format('YYYY-MM-DD');
  const dow = d.day();
  const blocks = emp?.employeeData?.blocks || [];
  const out = [];
  for (const b of blocks) {
    if (!b.active) continue;

    if (b.wholeDay) {
      const match = (b.repeat === 'weekly' && b.dayOfWeek === dow) ||
                    (b.repeat === 'none'   && b.date && dayjs(b.date).isSame(d, 'day'));
      if (match) out.push({ start: d.startOf('day'), end: d.endOf('day') });
      continue;
    }

    if (b.repeat === 'weekly' && b.dayOfWeek === dow) {
      out.push({ start: parseHM(ymd, b.start), end: parseHM(ymd, b.end) });
    } else if (b.repeat === 'none' && b.date && dayjs(b.date).isSame(d, 'day')) {
      out.push({ start: parseHM(ymd, b.start), end: parseHM(ymd, b.end) });
    }
  }
  return out;
}

function fitsAnyShift(shifts, start, end) {
  return shifts.some(s => !start.isBefore(s.start) && !end.isAfter(s.end));
}

function overlapsAny(intervals, start, end) {
  return intervals.some(i => start.isBefore(i.end) && end.isAfter(i.start));
}



// 🧠 Util: حساب وقت نهاية الخدمة
function calculateEndTime(start, duration) {
  return dayjs(start).add(duration, 'minute').toDate();
}

// 🔔 Util: إرسال إشعار واتساب
// async function sendBookingNotification(booking, action) {
//   const message = `تم ${action} للحجز رقم: ${booking._id}`;
//   const recipients = await User.find({ salonId: booking.salonId });

//   for (const user of recipients) {
//     if (user.phone) {
//       await axios.post('https://api.wasender.io/send', {
//         to: user.phone,
//         message,
//       });
//     }
//   }
// }

// 🟢 1. إنشاء حجز
// exports.createBooking = asyncHandler(async (req, res) => {
//   const { clientName, clientPhone, date, startTime, selections,salonId } = req.body;
  

//   let current = dayjs(`${date} ${startTime}`);
//   const serviceMap = {};
//   const services = await Service.find({ _id: { $in: selections.map(s => s.serviceId) } });

//   let totalPrice = 0;
//   services.forEach(s => {
//     const duration = (s.durationMin ?? s.duration);
//     serviceMap[s._id] = { duration, price: s.price };
//     totalPrice += s.price;
//   });

//   const servicesWithTime = selections.map(s => {
//     const start = current.toDate();
//     const end = dayjs(start).add(serviceMap[s.serviceId].duration, 'minute').toDate();
//     current = dayjs(end);
//     return {
//       serviceId: s.serviceId,
//       employeeId: s.employeeId,
//       start,
//       end,
//       price: serviceMap[s.serviceId].price
//     };
//   });

//   const totalDuration = servicesWithTime.reduce((acc, s) => acc + serviceMap[s.serviceId].duration, 0);

//   // (اختياري) اربط بالهاتف
//   let clientId = req.user?.role === 'client' ? req.user._id : undefined;
//   if (!clientId && clientPhone) {
//     const existing = await User.findOne({ phone: clientPhone }).select('_id');
//     if (existing) clientId = existing._id;
//   }

//   const booking = await Booking.create({
//     clientName, clientPhone, salonId,
//     services: servicesWithTime,
//     totalDuration, totalPrice,
//     date: dayjs(date).startOf('day').toDate(),
//     clientId,
//     status: 'scheduled'
//   });
// sendBookingNotification(booking, 'book').catch((e) => {
//   console.warn('notify(book) failed:', e?.response?.data || e.message);
// });
//   res.status(201).json(booking);
// });

exports.createBooking = asyncHandler(async (req, res) => {
  const { clientName, clientPhone, date, startTime, selections, salonId, couponCode } = req.body;

  // 1) حساب الأوقات والأسعار
  let current = dayjs(`${date} ${startTime}`);
  const serviceMap = {};
  const services = await Service.find({ _id: { $in: selections.map(s => s.serviceId) } });

  let totalPrice = 0;
  services.forEach(s => {
    const duration = (s.durationMin ?? s.duration);
    serviceMap[s._id] = { duration, price: s.price };
    totalPrice += s.price;
  });

  const servicesWithTime = selections.map(s => {
    const start = current.toDate();
    const end = dayjs(start).add(serviceMap[s.serviceId].duration, 'minute').toDate();
    current = dayjs(end);
    return {
      serviceId: s.serviceId,
      employeeId: s.employeeId,
      start,
      end,
      price: serviceMap[s.serviceId].price
    };
  });

  const totalDuration = servicesWithTime.reduce((acc, s) => acc + serviceMap[s.serviceId].duration, 0);

  // 2) محاولة ربط العميل
  let clientId = req.user?.role === 'client' ? req.user._id : undefined;
  if (!clientId && clientPhone) {
    const existing = await User.findOne({ phone: clientPhone }).select('_id');
    if (existing) clientId = existing._id;
  }

  // 3) تطبيق الكوبون (لو موجود)
  let discount = 0;
  let couponInfo = null;

  if (couponCode && totalPrice > 0) {
    const code = String(couponCode).toUpperCase();
    const coupon = await Coupon.findOne({ code });
    const now = new Date();

    const valid =
      coupon && coupon.active &&
      (!coupon.startsAt || now >= coupon.startsAt) &&
      (!coupon.endsAt   || now <= coupon.endsAt) &&
      (coupon.global || coupon.salons.some(s => String(s) === String(salonId))) &&
      (coupon.usageLimit == null || coupon.usedCount < coupon.usageLimit) &&
      totalPrice >= (coupon?.minOrder || 0);

    if (valid) {
      // حد استخدام لكل عميل
      const userFilter = clientId ? { clientId } : (clientPhone ? { clientPhone } : {});
      let canUse = true;
      if (coupon.perUserLimit && Object.keys(userFilter).length) {
        const usedByUser = await CouponRedemption.countDocuments({ couponId: coupon._id, ...userFilter });
        if (usedByUser >= coupon.perUserLimit) canUse = false;
      }

      if (canUse) {
        discount = coupon.type === 'percent'
          ? (totalPrice * coupon.value) / 100
          : coupon.value;

        if (coupon.maxDiscount != null) discount = Math.min(discount, coupon.maxDiscount);
        discount = Math.min(discount, totalPrice); // ماينفعش ينزل الإجمالي تحت الصفر

        couponInfo = { couponId: coupon._id, code: coupon.code, discount };
      }
    }
  }

  // 4) إنشاء الحجز بالقيم بعد الخصم
  const booking = await Booking.create({
    clientName,
    clientPhone,
    salonId,
    services: servicesWithTime,
    totalDuration,
    totalPriceBefore: totalPrice,
    discount,
    totalPrice: totalPrice - discount,
    coupon: couponInfo,
    date: dayjs(date).startOf('day').toDate(),
    clientId,
    status: 'scheduled'
  });

  // 5) تحديث استخدام الكوبون وتسجيل Redemption (لو اتطبّق)
  if (couponInfo) {
    await Coupon.updateOne({ _id: couponInfo.couponId }, { $inc: { usedCount: 1 } });
    await CouponRedemption.create({
      couponId: couponInfo.couponId,
      bookingId: booking._id,
      salonId,
      clientId,
      clientPhone,
      discount
    });
  }

  // 6) إشعاراتك
  sendBookingNotification(booking, 'book').catch((e) => {
    console.warn('notify(book) failed:', e?.response?.data || e.message);
  });

  res.status(201).json(booking);
});

// 🟢 2. المواعيد المتاحة
exports.getAvailableSlots = asyncHandler(async (req, res) => {
  const { date, selections ,salonId} = req.body;

  // durations
  const serviceMap = {};
  const services = await Service.find({ _id: { $in: selections.map(s => s.serviceId) } });
  services.forEach(s => { serviceMap[s._id] = (s.durationMin ?? s.duration); });

  // employees
  const employeeIds = [...new Set(selections.map(s => s.employeeId))];
  const employees = await User.find({ _id: { $in: employeeIds }, role: { $in: ['barber'] } })
                              .lean();
  const employeeMap = Object.fromEntries(employees.map(e => [String(e._id), e]));

  // existing bookings
  const bookings = await Booking.find({
    salonId,
    date: { $gte: dayjs(date).startOf('day').toDate(), $lte: dayjs(date).endOf('day').toDate() },
    'services.employeeId': { $in: employeeIds }
  }).lean();

  const busyMap = {};
  employeeIds.forEach(id => busyMap[id] = []);
  bookings.forEach(b => {
    b.services.forEach(svc => {
      const id = String(svc.employeeId);
      if (busyMap[id]) busyMap[id].push({ start: dayjs(svc.start), end: dayjs(svc.end) });
    });
  });

  const totalDuration = selections.reduce((acc, s) => acc + (serviceMap[s.serviceId] || 0), 0);
  const available = [];
  let current = dayjs(date).hour(0).minute(0).second(0).millisecond(0);
  const maxStart = dayjs(date).endOf('day').subtract(totalDuration, 'minute');

  while (current.isBefore(maxStart) || current.isSame(maxStart)) {
    let ok = true;
    let tempStart = current;

    for (const sel of selections) {
      const duration = serviceMap[sel.serviceId];
      const tempEnd = tempStart.add(duration, 'minute');

      const emp = employeeMap[String(sel.employeeId)];
      if (!emp) { ok = false; break; }

      const shifts = employeeShiftsForDate(emp, date);
      if (!shifts.length || !fitsAnyShift(shifts, tempStart, tempEnd)) { ok = false; break; }

      const blocks = employeeBlockIntervalsForDate(emp, date);
      if (overlapsAny(blocks, tempStart, tempEnd)) { ok = false; break; }

      const busy = busyMap[String(sel.employeeId)] || [];
      if (overlapsAny(busy, tempStart, tempEnd)) { ok = false; break; }

      tempStart = tempEnd; // السervice اللي بعدها تبدأ بعد نهاية الحالية
    }

    if (ok) available.push(current.format('HH:mm'));
    current = current.add(10, 'minute'); // step
  }

  res.json({ slots: available });
});


// 🟢 3. استعلامات الحجز حسب الدور (client - barber - admin)
exports.getMyBookings = asyncHandler(async (req, res) => {
  const filter = req.user.role === 'client'
    ? { clientId: req.user._id }
    : { 'services.employeeId': req.user._id };
  const bookings = await Booking.find(filter).sort({ date: -1 });
  res.json(bookings);
});

// 🟢 4. إلغاء الحجز
exports.cancelBooking = asyncHandler(async (req, res) => {
  const { reason } = req.body;
  const booking = await Booking.findById(req.params.id);
  if (!booking) return res.status(404).json({ message: 'Booking not found' });

  const isOwner = req.user.role === 'client' && booking.clientId?.toString() === req.user.id;
  const isEmployee = ['barber', 'specialist'].includes(req.user.role) && booking.services.some(s => s.employeeId.toString() === req.user.id);
  const isAdmin = ['admin', 'owner'].includes(req.user.role);

  if (!isOwner && !isEmployee && !isAdmin) return res.status(403).json({ message: 'Not allowed' });

  booking.status = 'cancelled';
  booking.cancelReason = reason;
  await booking.save();

  await sendBookingNotification(booking, 'تم إلغاء الحجز');
  res.json(booking);
});

// 🟢 5. تعديل الحجز
exports.editBooking = asyncHandler(async (req, res) => {
  const { selections, date, startTime, reason } = req.body;
  const booking = await Booking.findById(req.params.id);
  if (!booking) return res.status(404).json({ message: 'Booking not found' });

  const isOwner = req.user.role === 'client' && booking.clientId?.toString() === req.user.id;
  const isEmployee = ['barber','specialist'].includes(req.user.role) && booking.services.some(s => s.employeeId.toString() === req.user.id);
  const isAdmin = ['admin','owner'].includes(req.user.role);
  if (!isOwner && !isEmployee && !isAdmin) return res.status(403).json({ message: 'Not allowed' });

  const serviceMap = {};
  const services = await Service.find({ _id: { $in: selections.map(s => s.serviceId) } });
  services.forEach(s => (serviceMap[s._id] = { duration: (s.durationMin ?? s.duration), price: s.price }));

  let current = dayjs(`${date} ${startTime}`);
  const servicesWithTime = selections.map(s => {
    const start = current.toDate();
    const end = dayjs(start).add(serviceMap[s.serviceId].duration, 'minute').toDate();
    current = dayjs(end);
    return { serviceId: s.serviceId, employeeId: s.employeeId, start, end, price: serviceMap[s.serviceId].price };
  });

  booking.services = servicesWithTime;
  booking.totalDuration = servicesWithTime.reduce((acc, s) => acc + serviceMap[s.serviceId].duration, 0);
  booking.totalPrice = servicesWithTime.reduce((acc, s) => acc + s.price, 0);
  booking.date = dayjs(date).startOf('day').toDate();
  booking.editReason = reason;
  booking.status = 'rescheduled';
  await booking.save();

  await sendBookingNotification(booking, 'تم تعديل الحجز');
  res.json(booking);
});



exports.cancelBookingByAdmin = asyncHandler(async (req, res) => {
  const { reason } = req.body;

  const cancelled = await Booking.findByIdAndUpdate(
    req.params.id,
    {
      status: 'cancelled',
      cancelReason: reason
    },
    { new: true }
  );

  if (!cancelled) return res.status(404).json({ message: 'Booking not found' });

  await sendBookingNotification(cancelled, 'cancelled_by_admin');

  res.json(cancelled);
});


exports.editBookingByAdmin = asyncHandler(async (req, res) => {
  const { selections, date, startTime, reason } = req.body;

  // نعيد استخدام نفس منطق الحجز لحساب التوقيتات
  const serviceMap = {};
  const services = await Service.find({ _id: { $in: selections.map(s => s.serviceId) } });
  services.forEach(s => {
    serviceMap[s._id] = s.durationMin;
  });

  let current = dayjs(`${date} ${startTime}`);
  const servicesWithTime = selections.map(s => {
    const start = current.toDate();
    const end = calculateEndTime(current, serviceMap[s.serviceId]);
    current = dayjs(end);
    return {
      serviceId: s.serviceId,
      employeeId: s.employeeId,
      start,
      end
    };
  });

  const totalDuration = servicesWithTime.reduce((acc, s) => acc + serviceMap[s.serviceId], 0);

  const updated = await Booking.findByIdAndUpdate(
    req.params.id,
    {
      services: servicesWithTime,
      totalDuration,
      date: dayjs(date).startOf('day').toDate(),
      editReason: reason,
      status: 'rescheduled'
    },
    { new: true }
  );

  if (!updated) return res.status(404).json({ message: 'Booking not found' });

  await sendBookingNotification(updated, 'edited_by_admin');

  res.json(updated);
});

exports.getSalonBookings = asyncHandler(async (req, res) => {
  const salonId = req.params.id;

  // لو موظف، رجّع بس الحجوزات اللي ليه هو
  if (['barber'].includes(req.user.role))  {
    const bookings = await Booking.find({
      salonId,
      'services.employeeId': req.user._id
    }).sort({ date: -1 });

    return res.json(bookings);
  }

  // غير كده (owner/admin): رجّع كل حجوزات الصالون
  const bookings = await Booking.find({ salonId }).sort({ date: -1 });
  res.json(bookings);
});


exports.cancelBookingByEmployee = asyncHandler(async (req, res) => {
  const { reason } = req.body;
  const booking = await Booking.findOne({ _id: req.params.id });
  if (!booking) return res.status(404).json({ message: 'Booking not found' });

  const isRelated = booking.services.some(s => s.employeeId.toString() === req.user.id);
  if (!isRelated) return res.status(403).json({ message: 'Not authorized' });

  booking.status = 'cancelled';
  booking.cancelReason = reason;
  await booking.save();

  await sendBookingNotification(booking, 'cancelled_by_employee');
  res.json(booking);
});




exports.editBookingByEmployee = asyncHandler(async (req, res) => {
  const { selections, date, startTime, reason } = req.body;

  const booking = await Booking.findOne({ _id: req.params.id });
  if (!booking) return res.status(404).json({ message: 'Booking not found' });

  const isRelated = booking.services.some(s => s.employeeId.toString() === req.user.id);
  if (!isRelated) return res.status(403).json({ message: 'Not authorized' });

  const serviceMap = {};
  const services = await Service.find({ _id: { $in: selections.map(s => s.serviceId) } });
  services.forEach(s => (serviceMap[s._id] = s.durationMin));

  let current = dayjs(`${date} ${startTime}`);
  const servicesWithTime = selections.map(s => {
    const start = current.toDate();
    const end = calculateEndTime(current, serviceMap[s.serviceId]);
    current = dayjs(end);
    return {
      serviceId: s.serviceId,
      employeeId: s.employeeId,
      start,
      end
    };
  });

  booking.services = servicesWithTime;
  booking.totalDuration = servicesWithTime.reduce((acc, s) => acc + serviceMap[s.serviceId], 0);
  booking.date = dayjs(date).startOf('day').toDate();
  booking.editReason = reason;
  booking.status = 'rescheduled';
  await booking.save();

  await sendBookingNotification(booking, 'edited_by_employee');
  res.json(booking);
});


exports.getEmployeeBookings = asyncHandler(async (req, res) => {
  const bookings = await Booking.find({ 'services.employeeId': req.user.id }).sort({ date: -1 });
  res.json(bookings);
});


exports.cancelBookingByClient = asyncHandler(async (req, res) => {
  const { reason } = req.body;
  const booking = await Booking.findOneAndUpdate(
    { _id: req.params.id, clientId: req.user.id },
    { status: 'cancelled', cancelReason: reason },
    { new: true }
  );

  if (!booking) return res.status(404).json({ message: 'Booking not found' });
  await sendBookingNotification(booking, 'cancelled_by_client');
  res.json(booking);
});


exports.updateBookingByClient = asyncHandler(async (req, res) => {
  const { selections, date, startTime, reason } = req.body;

  const booking = await Booking.findOne({ _id: req.params.id, clientId: req.user.id });
  if (!booking) return res.status(404).json({ message: 'Booking not found' });

  const serviceMap = {};
  const services = await Service.find({ _id: { $in: selections.map(s => s.serviceId) } });
  services.forEach(s => (serviceMap[s._id] = (s.durationMin ?? s.duration)));

  let current = dayjs(`${date} ${startTime}`);
  const servicesWithTime = selections.map(s => {
    const start = current.toDate();
    const end = dayjs(start).add(serviceMap[s.serviceId], 'minute').toDate();
    current = dayjs(end);
    return { serviceId: s.serviceId, employeeId: s.employeeId, start, end };
  });

  booking.services = servicesWithTime;
  booking.totalDuration = servicesWithTime.reduce((acc, s) => acc + serviceMap[s.serviceId], 0);
  booking.date = dayjs(date).startOf('day').toDate();
  booking.editReason = reason;
  booking.status = 'rescheduled';
  await booking.save();

  await sendBookingNotification(booking, 'edited_by_client');
  res.json(booking);
});


// const Booking = require('./booking.model');
// const Service = require('../services/service.model');
// const User    = require('../users/user.model');
// const { asyncHandler } = require('../../utils/asyncHandler');
// const dayjs = require('dayjs');
// ... لو عندك calculateEndTime و sendBookingNotification بالفعل فوق، سيبهم زي ما هم

// 🔹 1) إنشاء حجز بواسطة موظف (لنفسه فقط)
exports.createBookingByEmployee = asyncHandler(async (req, res) => {
  const { clientName, clientPhone, date, startTime, selections } = req.body;
  const salonId = req.tenant.salonId;

  // الموظف لازم يحجز لنفسه فقط (كل selection employeeId = req.user._id)
  if (!['barber','specialist'].includes(req.user.role)) {
    return res.status(403).json({ message: 'Only employees can use this endpoint' });
  }
  if (!selections?.length || !selections.every(s => String(s.employeeId) === String(req.user._id))) {
    return res.status(400).json({ message: 'Employees can only create bookings for themselves' });
  }

  // نفس منطق createBooking: حساب الأوقات والسعر الكلي
  let current = dayjs(`${date} ${startTime}`);
  const serviceMap = {};
  const services = await Service.find({ _id: { $in: selections.map(s => s.serviceId) } });

  let totalPrice = 0;
  services.forEach(s => {
    // durationMin في Service
    serviceMap[s._id] = { duration: s.durationMin ?? s.duration, price: s.price };
    totalPrice += s.price;
  });

  const servicesWithTime = selections.map(s => {
    const start = current.toDate();
    const end = dayjs(start).add(serviceMap[s.serviceId].duration, 'minute').toDate();
    current = dayjs(end);
    return { serviceId: s.serviceId, employeeId: s.employeeId, start, end, price: serviceMap[s.serviceId].price };
  });

  const totalDuration = servicesWithTime.reduce((acc, s) => acc + serviceMap[s.serviceId].duration, 0);

  const booking = await Booking.create({
    clientName,
    clientPhone,
    salonId,
    services: servicesWithTime,
    totalDuration,
    totalPrice,
    date: dayjs(date).startOf('day').toDate(),
    clientId: req.user?.role === 'client' ? req.user._id : undefined, // غالبًا undefined هنا
    status: 'scheduled'
  });

  res.status(201).json(booking);
});

// 🔹 2) وسم الحجز No-Show (الموظف المشارك أو المالك/الأدمن)
exports.markNoShow = asyncHandler(async (req, res) => {
  const { reason } = req.body || {};
  const booking = await Booking.findById(req.params.id);
  if (!booking) return res.status(404).json({ message: 'Booking not found' });

  const isEmployee = ['barber','specialist'].includes(req.user.role)
    && booking.services.some(s => String(s.employeeId) === String(req.user._id));
  const isAdmin = ['owner','admin'].includes(req.user.role);

  if (!isEmployee && !isAdmin) return res.status(403).json({ message: 'Not allowed' });

  // ممكن تضيف تحقق إن الحجز مر وقته (اختياري)
  booking.status = 'no-show';
  booking.cancelReason = reason || 'no-show';
  await booking.save();

  // زود noShowCount للعميل (لو موجود)
  if (booking.clientId) {
    await User.updateOne({ _id: booking.clientId }, { $inc: { noShowCount: 1 } });
  } else if (booking.clientPhone) {
    // Fallback: لو العميل مسجل بنفس رقم الموبايل
    await User.updateOne({ phone: booking.clientPhone }, { $inc: { noShowCount: 1 } });
  }


  await sendBookingNotification(booking, 'no_show');
  res.json(booking);
});

// 🔹 3) وسم الحجز Completed (الموظف المشارك أو المالك/الأدمن)
exports.markCompleted = asyncHandler(async (req, res) => {
  const booking = await Booking.findById(req.params.id);
  if (!booking) return res.status(404).json({ message: 'Booking not found' });

  const isEmployee = ['barber','specialist'].includes(req.user.role)
    && booking.services.some(s => String(s.employeeId) === String(req.user._id));
  const isAdmin = ['owner','admin'].includes(req.user.role);

  if (!isEmployee && !isAdmin) return res.status(403).json({ message: 'Not allowed' });

  booking.status = 'completed';
  booking.completedAt = new Date();
  await booking.save();

  await sendBookingNotification(booking, 'completed');
  res.json(booking);
});



exports.getClientsBookingsSummary = asyncHandler(async (req, res) => {
  // هنجيب صالون الـ tenant أو من params/query احتياطيًا
  const salonId =
    req?.tenant?.salonId ||
    req.params.salonId ||
    req.query.salonId;

  if (!salonId) {
    return res.status(400).json({ message: 'salonId is required' });
  }

  const salonObjId = new mongoose.Types.ObjectId(String(salonId));

  const data = await Booking.aggregate([
    { $match: { salonId: salonObjId } },

    // نحتاج الـ _id كـ bookingId قبل الـ unwind
    { $addFields: { bookingId: '$_id' } },

    // نفرد الخدمات عشان نقدر نلحق الموظف والخدمة
    { $unwind: '$services' },

    // لحاق بيانات الخدمة
    {
      $lookup: {
        from: 'services',
        localField: 'services.serviceId',
        foreignField: '_id',
        as: 'svc'
      }
    },
    { $unwind: { path: '$svc', preserveNullAndEmptyArrays: true } },

    // لحاق بيانات الموظف (الحلاق)
    {
      $lookup: {
        from: 'users',
        localField: 'services.employeeId',
        foreignField: '_id',
        as: 'emp'
      }
    },
    { $unwind: { path: '$emp', preserveNullAndEmptyArrays: true } },

    // نجمع مرة تانية على مستوى الحجز الواحد
    {
      $group: {
        _id: '$bookingId',
        salonId: { $first: '$salonId' },
        clientId: { $first: '$clientId' },
        clientName: { $first: '$clientName' },
        clientPhone: { $first: '$clientPhone' },
        date: { $first: '$date' },
        status: { $first: '$status' },
        totalDuration: { $first: '$totalDuration' },
        totalPrice: { $first: '$totalPrice' },
        services: {
          $push: {
            serviceId: '$services.serviceId',
            serviceName: '$svc.name',
            employeeId: '$services.employeeId',
            employeeName: '$emp.name',
            start: '$services.start',
            end: '$services.end',
            price: '$services.price'
          }
        }
      }
    },

    // لو معندوش clientName و فيه clientId نجيبه من users
    {
      $lookup: {
        from: 'users',
        localField: 'clientId',
        foreignField: '_id',
        as: 'client'
      }
    },
    { $unwind: { path: '$client', preserveNullAndEmptyArrays: true } },

    // نجمع على مستوى العميل: عدد الحجوزات + قائمة الحجوزات
    {
      $group: {
        _id: {
          clientId: '$clientId',
          clientPhone: '$clientPhone'
        },
        clientId: { $first: '$clientId' },
        clientPhone: { $first: '$clientPhone' },
        clientName: { $first: { $ifNull: ['$clientName', '$client.name'] } },
        totalBookings: { $sum: 1 },
        bookings: {
          $push: {
            bookingId: '$_id',
            date: '$date',
            status: '$status',
            totalDuration: '$totalDuration',
            totalPrice: '$totalPrice',
            services: '$services'
          }
        }
      }
    },

    // تنسيق الإخراج
    {
      $project: {
        _id: 0,
        clientId: 1,
        clientName: 1,
        clientPhone: 1,
        totalBookings: 1,
        bookings: 1
      }
    },

    // ترتيب اختياري: الأكثر حجزًا أولًا
    { $sort: { totalBookings: -1, clientName: 1 } }
  ]);

  res.json({ salonId, count: data.length, clients: data });
});