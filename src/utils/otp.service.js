// otp.service.js
const bcrypt = require('bcryptjs');
const dayjs = require('dayjs');
const crypto = require('crypto');
const User = require('../modules/users/user.model');
const { sendWA } = require('./notifications');

const OTP_TTL_MIN = Number(process.env.OTP_TTL_MIN || 10);
const OTP_RESEND_SECONDS = Number(process.env.OTP_RESEND_SECONDS || 60);
const OTP_MAX_ATTEMPTS = Number(process.env.OTP_MAX_ATTEMPTS || 5);
const OTP_LOCK_MIN = Number(process.env.OTP_LOCK_MIN || 15);

function genOTP() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function otpMsg(code) {
  return `رمز التحقق: ${code}\nصالح لمدة ${OTP_TTL_MIN} دقيقة. لا تشاركه مع أي شخص.`;
}

function assertPurpose(purpose) {
  if (!['register','reset'].includes(purpose)) {
    const e = new Error('Invalid OTP purpose'); e.status = 400; throw e;
  }
}

function pathForPurpose(purpose) {
  return `otps.${purpose}`;
}

// إرسال/تجديد OTP
async function sendOtp({ user, purpose }) {
  assertPurpose(purpose);
  const now = new Date();
  const p = user.otps?.[purpose] || {};

  // rate limit
  if (p.lockedUntil && now < p.lockedUntil) {
    const waitMin = Math.ceil((p.lockedUntil - now) / 60000);
    const e = new Error(`الحساب مقفول مؤقتًا. جرّب بعد ${waitMin} دقيقة.`); e.status = 429; throw e;
  }
  if (p.lastSentAt && (now - p.lastSentAt) < OTP_RESEND_SECONDS * 1000) {
    const wait = Math.ceil((OTP_RESEND_SECONDS * 1000 - (now - p.lastSentAt)) / 1000);
    const e = new Error(`من فضلك انتظر ${wait} ثانية قبل طلب كود جديد.`); e.status = 429; throw e;
  }

  const code = genOTP();
  const hash = await bcrypt.hash(code, 10);

  user.set(pathForPurpose(purpose), {
    hash,
    expiresAt: dayjs(now).add(OTP_TTL_MIN, 'minute').toDate(),
    attempts: 0,
    lastSentAt: now,
    lockedUntil: null
  });

  await user.save();

  try {
    await sendWA(user.phone, otpMsg(code));
    console.log(`OTP sent to ${user.phone} for ${purpose}`);
  } catch (err) {
    // rollback
    user.set(pathForPurpose(purpose), undefined);
    await user.save();
    const e = new Error('تعذّر إرسال كود التحقق عبر واتساب. حاول لاحقًا.'); e.status = 502; throw e;
    console.error('WA send error:', err);
  }
}

// التحقق من OTP
async function verifyOtp({ userId, code, purpose }) {
  assertPurpose(purpose);
  const user = await User.findById(userId);
  if (!user) { const e = new Error('طلب غير صحيح'); e.status = 400; throw e; }

  const slot = user.otps?.[purpose];
  if (!slot?.hash || !slot?.expiresAt) {
    const e = new Error('الكود منتهي أو غير موجود'); e.status = 400; throw e;
  }

  const now = new Date();
  if (slot.lockedUntil && now < slot.lockedUntil) {
    const waitMin = Math.ceil((slot.lockedUntil - now) / 60000);
    const e = new Error(`الحساب مقفول مؤقتًا. جرّب بعد ${waitMin} دقيقة.`); e.status = 429; throw e;
  }
  if (now > slot.expiresAt) {
    const e = new Error('الكود منتهي الصلاحية. اطلب كودًا جديدًا.'); e.status = 400; throw e;
  }

  const ok = await bcrypt.compare(String(code), slot.hash);
  if (!ok) {
    const attempts = (slot.attempts || 0) + 1;
    const update = { ...slot, attempts };
    if (attempts >= OTP_MAX_ATTEMPTS) {
      update.lockedUntil = dayjs(now).add(OTP_LOCK_MIN, 'minute').toDate();
    }
    user.set(pathForPurpose(purpose), update);
    await user.save();
    const e = new Error('كود غير صحيح.'); e.status = 400; throw e;
  }

  // success → نظّف هذا الـ purpose فقط
  user.set(pathForPurpose(purpose), undefined);
  await user.save();

  return user;
}

// لو عايز resetToken بعد تحقق OTP (لفلو إعادة الباسورد)
async function issueResetToken(user) {
  const raw = crypto.randomBytes(16).toString('hex'); // 32-char
  const hash = await bcrypt.hash(raw, 10);
  user.resetTokenHash = hash;
  user.resetTokenExpires = dayjs().add(15, 'minute').toDate();
  await user.save();
  return raw; // يرجع للعميل
}

module.exports = { sendOtp, verifyOtp, issueResetToken };
