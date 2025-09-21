

const axios = require('axios');
const dayjs = require('dayjs');
const User  = require('../modules/users/user.model');
const Service = require('../modules/services/service.model');

/** إعدادات مزوّد الواتساب */
const WA_URL = 'https://wasenderapi.com/api/send-message';
const WA_HEADERS = () => ({
  Authorization: `Bearer ${process.env.WHATSAPP_API_KEY}`,
  'Content-Type': 'application/json'
});

/** 🔧 وضع الاختبار: ابعت كل الرسائل على رقم واحد */
const TEST_PHONE = process.env.WHATSAPP_TEST_PHONE || '+201113424043'; // رقمك للاختبار
const USE_TEST_OVERRIDE = false; // خلّيها false لما تخلّص الاختبارات

// const normalizePhone = (p) => (p ? String(p).replace(/\s+/g, '') : null);
// الدولة الافتراضية: مصر
const DEFAULT_CC = '+20';

/**
 * يطبع رقم واتساب بصيغة دولية:
 *  - يحافظ على الأرقام فقط (ويضيف + في البداية)
 *  - لو الرقم محلي (011… أو 01….) → يحوّله إلى +20…
 *  - لو 20… بدون + → يضيف +
 *  - لو 00 20… → يحوّله إلى +20…
 *  - لو الرقم أصلاً +20… → يرجّعه زي ما هو بعد التنظيف
 */

const normalizePhone = (raw) => {
  if (!raw) return null;

  let s = String(raw).trim();

  // لو الرقم أصلاً بصيغة دولية (+...) نحافظ على + وننظف باقي الرقم
  if (s.startsWith('+')) {
    return '+' + s.slice(1).replace(/[^\d]/g, '');
  }

  // شيل أي رموز غير أرقام
  s = s.replace(/[^\d]/g, '');

  // 00… -> صيغة دولية (00 = +)
  if (s.startsWith('00')) s = s.slice(2);

  // لو بدأ بـ 20 -> ضيف +
  if (s.startsWith('20')) return '+' + s;

  // لو بدأ بـ 0 (رقم محلي مصري) -> +20 مع حذف الصفر
  if (s.startsWith('0')) return DEFAULT_CC + s.slice(1);

  // أرقام محلية بدون صفر -> اعتبرها مصر وأضف +20
  return DEFAULT_CC + s;
};

const uniq = (arr) => Array.from(new Set((arr || []).filter(Boolean)));

const postWA = (to, text) =>
  axios.post(
    WA_URL,
    // NOTE: لو مزوّدك يحتاج { phone } بدّل المفتاح هنا بسهولة
    { to, text },
    { headers: WA_HEADERS() }
  );

const sendMany = async (phones, text) => {
  const targets = USE_TEST_OVERRIDE && TEST_PHONE
    ? [normalizePhone(TEST_PHONE)]
    : uniq(phones.map(normalizePhone));

  if (!targets.length || !text) return { sent: 0, failed: 0 };

  const results = await Promise.allSettled(
    targets.map((to) => postWA(to, text))
  );

  const sent   = results.filter(r => r.status === 'fulfilled').length;
  const failed = results.length - sent;

  if (failed) {
    console.warn(
      'WA failed:', failed,
      results
        .map((r, i) => r.status === 'rejected'
          ? { to: targets[i], err: r.reason?.response?.data || r.reason?.text }
          : null
        )
        .filter(Boolean)
    );
  } else {
    console.log('WA sent ->', targets);
  }
  return { sent, failed };
};

/**
 * booking:
 *  - salonId
 *  - client: { name, phone, ... } أو clientId
 *  - services: [{ serviceId, employeeId, start, end, ... }, ...]
 * action: 'book' | 'cancel' | 'reschedule'
 */
async function resolveRecipients(booking) {
  const employeeIds = uniq((booking.services || []).map(s => String(s.employeeId)));

  const [employees, managers, owners] = await Promise.all([
    User.find({ _id: { $in: employeeIds } }).select('name phone role').lean(),
    User.find({ salonId: booking.salonId, role: { $in: ['admin', 'manager'] } })
        .select('name phone role').lean(),
    User.find({ salonId: booking.salonId, role: 'owner' })
        .select('name phone role').lean(),
  ]);

  let customerPhone = null;
  if (booking.client?.phone) customerPhone = booking.client.phone;
  else if (booking.clientId) {
    const c = await User.findById(booking.clientId).select('phone').lean();
    customerPhone = c?.phone || null;
  }

  return { employees, managers, owners, customerPhone };
}

function fmtServices(services, serviceMap) {
  const names = (services || []).map(s => serviceMap[String(s.serviceId)]?.name).filter(Boolean);
  return names.length ? ` (${names.join(' + ')})` : '';
}

async function buildTemplates(booking, action) {
  const serviceIds = uniq((booking.services || []).map(s => s.serviceId));
  const services = await Service.find({ _id: { $in: serviceIds } }).select('name').lean();
  const serviceMap = Object.fromEntries(services.map(s => [String(s._id), s]));

  const date  = dayjs(booking.date || booking.start || new Date()).format('YYYY-MM-DD');
  const start = booking.start ? dayjs(booking.start).format('HH:mm') : null;
  const code  = booking._id;
  const suffix = fmtServices(booking.services, serviceMap);

  const common = {
    toEmployee: (empName) => {
      if (action === 'book')       return `تم حجز${suffix} لك يا ${empName} — الحجز رقم: ${code} بتاريخ ${date}${start ? ` ${start}` : ''}.`;
      if (action === 'cancel')     return `تم إلغاء${suffix} تخصّك يا ${empName} — الحجز رقم: ${code} بتاريخ ${date}.`;
      if (action === 'reschedule') return `تم إعادة جدولة${suffix} تخصّك يا ${empName} — الحجز رقم: ${code} إلى ${date}${start ? ` ${start}` : ''}.`;
      return `تحديث على الحجز رقم: ${code}.`;
    },
    toManager: () => {
      if (action === 'book')       return `تم حجز${suffix} — الحجز رقم: ${code} بتاريخ ${date}${start ? ` ${start}` : ''}.`;
      if (action === 'cancel')     return `تم إلغاء${suffix} — الحجز رقم: ${code} بتاريخ ${date}.`;
      if (action === 'reschedule') return `تم إعادة جدولة${suffix} — الحجز رقم: ${code} إلى ${date}${start ? ` ${start}` : ''}.`;
      return `تحديث على الحجز رقم: ${code}.`;
    },
    toOwner: () => {
      if (action === 'book')       return `حجز جديد${suffix} — رقم: ${code} بتاريخ ${date}${start ? ` ${start}` : ''}.`;
      if (action === 'cancel')     return `تم إلغاء حجز${suffix} — رقم: ${code}.`;
      if (action === 'reschedule') return `إعادة جدولة حجز${suffix} — رقم: ${code} إلى ${date}${start ? ` ${start}` : ''}.`;
      return `تحديث على الحجز رقم: ${code}.`;
    },
    toCustomer: () => {
      if (action === 'book')       return `تم تأكيد حجزك${suffix} — رقم: ${code} بتاريخ ${date}${start ? ` ${start}` : ''}.`;
      if (action === 'cancel')     return `تم إلغاء حجزك${suffix} — رقم: ${code}.`;
      if (action === 'reschedule') return `تم إعادة جدولة حجزك${suffix} — رقم: ${code} إلى ${date}${start ? ` ${start}` : ''}.`;
      return `تحديث على حجزك رقم: ${code}.`;
    },
  };

  return common;
}

// action: 'book' | 'cancel' | 'reschedule'
async function sendBookingNotification(booking, action) {
  const { employees, managers, owners, customerPhone } = await resolveRecipients(booking);
  const T = await buildTemplates(booking, action);

  // 1) الموظفون المعنيون (رسالة شخصية لكل موظف)
  if (employees?.length) {
    await Promise.allSettled(
      employees
        .filter(e => e.phone || USE_TEST_OVERRIDE)
        .map(e => {
          const to = USE_TEST_OVERRIDE && TEST_PHONE ? normalizePhone(TEST_PHONE) : normalizePhone(e.phone);
          return postWA(to, T.toEmployee(e.name || 'زميلنا'));
        })
    );
  }

  // 2) المدير
  if (managers?.length) {
    await sendMany(managers.map(m => m.phone), T.toManager());
  }

  // 3) المالك
  if (owners?.length) {
    await sendMany(owners.map(o => o.phone), T.toOwner());
  }

  // 4) العميل (تأكيد/إلغاء/إعادة جدولة)
  if (['book', 'cancel', 'reschedule'].includes(action)) {
    const to = USE_TEST_OVERRIDE && TEST_PHONE ? normalizePhone(TEST_PHONE) : normalizePhone(customerPhone);
    if (to) await postWA(to, T.toCustomer());
  }
}




// otp section 

async function sendWA(to, text) {
  const target = USE_TEST_OVERRIDE && TEST_PHONE ? normalizePhone(TEST_PHONE) : normalizePhone(to);
  if (!target || !text) return;
  await axios.post(WA_URL, { to: target, text }, { headers: WA_HEADERS(), timeout: 15000 });
}

module.exports = { sendBookingNotification, sendWA };
