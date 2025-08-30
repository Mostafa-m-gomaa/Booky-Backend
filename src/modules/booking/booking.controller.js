


const Booking = require('./booking.model');
const Service = require('../services/service.model');
const User = require('../users/user.model');
const { asyncHandler } = require('../../utils/asyncHandler');
const dayjs = require('dayjs');
const axios = require('axios');

// 🧠 Util: حساب وقت نهاية الخدمة
function calculateEndTime(start, duration) {
  return dayjs(start).add(duration, 'minute').toDate();
}

// 🔔 Util: إرسال إشعار واتساب
async function sendBookingNotification(booking, action) {
  const message = `تم ${action} للحجز رقم: ${booking._id}`;
  const recipients = await User.find({ salonId: booking.salonId });

  for (const user of recipients) {
    if (user.phone) {
      await axios.post('https://api.wasender.io/send', {
        to: user.phone,
        message,
      });
    }
  }
}

// 🟢 1. إنشاء حجز
exports.createBooking = asyncHandler(async (req, res) => {
  const { clientName, clientPhone, date, startTime, selections } = req.body;
  const salonId = req.tenant.salonId;

  let current = dayjs(`${date} ${startTime}`);
  const serviceMap = {};
  const services = await Service.find({ _id: { $in: selections.map(s => s.serviceId) } });

  let totalPrice = 0;
  services.forEach(s => {
    serviceMap[s._id] = { duration: s.duration, price: s.price };
    totalPrice += s.price;
  });

  const servicesWithTime = selections.map(s => {
    const start = current.toDate();
    const end = calculateEndTime(current, serviceMap[s.serviceId].duration);
    current = dayjs(end);
    return {
      serviceId: s.serviceId,
      employeeId: s.employeeId,
      start,
      end,
      price: serviceMap[s.serviceId].price,
    };
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
    clientId: req.user?._id,
  });

  res.status(201).json(booking);
});

// 🟢 2. المواعيد المتاحة
exports.getAvailableSlots = asyncHandler(async (req, res) => {
  const { date, selections } = req.body;
  const salonId = req.tenant.salonId;

  const serviceMap = {};
  const services = await Service.find({ _id: { $in: selections.map(s => s.serviceId) } });
  services.forEach(s => (serviceMap[s._id] = s.duration));

  const employeeIds = [...new Set(selections.map(s => s.employeeId))];
  const employees = await User.find({ _id: { $in: employeeIds }, role: { $in: ['barber', 'specialist'] } });

  const employeeMap = Object.fromEntries(employees.map(emp => [emp._id.toString(), emp]));
  const bookings = await Booking.find({
    salonId,
    date: {
      $gte: dayjs(date).startOf('day').toDate(),
      $lte: dayjs(date).endOf('day').toDate(),
    },
    'services.employeeId': { $in: employeeIds },
  });

  const busyMap = {};
  employeeIds.forEach(id => (busyMap[id] = []));
  bookings.forEach(b => {
    b.services.forEach(s => {
      busyMap[s.employeeId]?.push({ start: dayjs(s.start), end: dayjs(s.end) });
    });
  });

  const availableSlots = [];
  const totalDuration = selections.reduce((acc, s) => acc + serviceMap[s.serviceId], 0);
  let current = dayjs(date).hour(0).minute(0);
  const maxStartTime = dayjs(date).endOf('day').subtract(totalDuration, 'minute');

  while (current.isBefore(maxStartTime)) {
    let isValid = true;
    let tempStart = current;

    for (const s of selections) {
      const duration = serviceMap[s.serviceId];
      const emp = employeeMap[s.employeeId];
if (!emp || !emp.employeeData?.startTime || !emp.employeeData?.endTime) {
  isValid = false;
  break;
}

const empStart = dayjs(`${date} ${emp.employeeData.startTime}`);
const empEnd = dayjs(`${date} ${emp.employeeData.endTime}`);
      const tempEnd = tempStart.add(duration, 'minute');

      if (tempStart.isBefore(empStart) || tempEnd.isAfter(empEnd)) { isValid = false; break; }
      const clash = busyMap[s.employeeId].some(b => tempStart.isBefore(b.end) && tempEnd.isAfter(b.start));
      if (clash) { isValid = false; break; }

      tempStart = tempEnd;
    }

    if (isValid) availableSlots.push(current.format('HH:mm'));
    current = current.add(10, 'minute');
  }

  res.json({ slots: availableSlots });
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
  const isEmployee = ['barber', 'specialist'].includes(req.user.role) && booking.services.some(s => s.employeeId.toString() === req.user.id);
  const isAdmin = ['admin', 'owner'].includes(req.user.role);
  if (!isOwner && !isEmployee && !isAdmin) return res.status(403).json({ message: 'Not allowed' });

  const serviceMap = {};
  const services = await Service.find({ _id: { $in: selections.map(s => s.serviceId) } });
  services.forEach(s => (serviceMap[s._id] = s.duration));

  let current = dayjs(`${date} ${startTime}`);
  const servicesWithTime = selections.map(s => {
    const start = current.toDate();
    const end = calculateEndTime(current, serviceMap[s.serviceId]);
    current = dayjs(end);
    return { serviceId: s.serviceId, employeeId: s.employeeId, start, end };
  });

  booking.services = servicesWithTime;
  booking.totalDuration = servicesWithTime.reduce((acc, s) => acc + serviceMap[s.serviceId], 0);
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
    serviceMap[s._id] = s.duration;
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
  const salonId = req.tenant.salonId;

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
  services.forEach(s => (serviceMap[s._id] = s.duration));

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
  const updated = await Booking.findOneAndUpdate(
    { _id: req.params.id, clientId: req.user.id },
    { selections, date, startTime, editReason: reason, status: 'rescheduled' },
    { new: true }
  );

  if (!updated) return res.status(404).json({ message: 'Booking not found' });
  await sendBookingNotification(updated, 'edited_by_client');
  res.json(updated);
});


