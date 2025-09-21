const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../users/user.model');
const { signAccessToken, signRefreshToken, setRefreshCookie, clearRefreshCookie } = require('./auth.service');
const { ENV } = require('../../config/env');
const { asyncHandler } = require('../../utils/asyncHandler');
const {sendWA} =require('../../utils/notifications');
const dayjs = require('dayjs');

const OTP_TTL_MIN = Number(process.env.OTP_TTL_MIN || 10);
const OTP_RESEND_SECONDS = Number(process.env.OTP_RESEND_SECONDS || 60);
const OTP_MAX_ATTEMPTS = Number(process.env.OTP_MAX_ATTEMPTS || 5);
const OTP_LOCK_MIN = Number(process.env.OTP_LOCK_MIN || 15);
function generateOTP() {
  return String(Math.floor(100000 + Math.random() * 900000));
}
function otpMessage(code) {
  return `رمز التفعيل الخاص بك هو: ${code}\nصالح لمدة ${OTP_TTL_MIN} دقيقة. لا تشاركه مع أي شخص.`;
}


const verifyOtp = async (req, res, next) => {
  try {
    const { userId, code } = req.body;
    const user = await User.findById(userId).select('+passwordHash');
    if (!user) return res.status(400).json({ message: 'طلب غير صحيح' });

    const now = new Date();

    if (!user.otp?.hash || !user.otp?.expiresAt || now > user.otp.expiresAt) {
      return res.status(400).json({ message: 'الكود منتهي الصلاحية. اطلب كودًا جديدًا.' });
    }

    if (user.otp?.lockedUntil && now < user.otp.lockedUntil) {
      const waitMin = Math.ceil((user.otp.lockedUntil - now) / 60000);
      return res.status(429).json({ message: `الحساب مقفول مؤقتًا. جرّب بعد ${waitMin} دقيقة.` });
    }

    const ok = await bcrypt.compare(String(code), user.otp.hash);
    if (!ok) {
      user.otp.attempts = (user.otp.attempts || 0) + 1;

      if (user.otp.attempts >= OTP_MAX_ATTEMPTS) {
        user.otp.lockedUntil = dayjs(now).add(OTP_LOCK_MIN, 'minute').toDate();
      }

      await user.save();
      return res.status(400).json({ message: 'كود غير صحيح.' });
    }

    // ✅ صح: فعّل الحساب
    user.isPhoneVerified = true;
    user.activatedAt = now;
    // (اختياري) لو عايز تربط التفعيل الإداري بالتفعيل الهاتفي:
    // user.isActive = true;

    user.otp = {}; // امسح بيانات الـ OTP
    await user.save();

    // ⬇️ إصدار التوكينات فورًا
    const accessToken  = signAccessToken(user);
    const refreshToken = signRefreshToken(user);
    setRefreshCookie(res, refreshToken);

    return res.json({
      message: 'تم التحقق من رقمك وتفعيل الحساب.',
      accessToken,
      user: {
        id: user._id,
        name: user.name,
        phone: user.phone,
        role: user.role,
        salonId: user.salonId,
      },
    });
  } catch (e) {
    next(e);
  }
};

/**
 * POST /auth/resend-otp
 * body: { userId }
 */
const resendOtp = async (req, res, next) => {
  try {
    const { userId } = req.body;
    const user = await User.findById(userId);
    if (!user) return res.status(400).json({ message: 'طلب غير صحيح' });
    if (user.isPhoneVerified) return res.status(400).json({ message: 'الحساب مفعّل بالفعل.' });

    const now = new Date();

    if (user.otp?.lockedUntil && now < user.otp.lockedUntil) {
      const waitMin = Math.ceil((user.otp.lockedUntil - now) / 60000);
      return res.status(429).json({ message: `الحساب مقفول مؤقتًا. جرّب بعد ${waitMin} دقيقة.` });
    }

    if (user.otp?.lastSentAt && (now - user.otp.lastSentAt) < OTP_RESEND_SECONDS * 1000) {
      const wait = Math.ceil((OTP_RESEND_SECONDS * 1000 - (now - user.otp.lastSentAt)) / 1000);
      return res.status(429).json({ message: `من فضلك انتظر ${wait} ثانية قبل طلب كود جديد.` });
    }

    const code = generateOTP();
    const hash = await bcrypt.hash(code, 10);

    user.otp = {
      hash,
      expiresAt: dayjs(now).add(OTP_TTL_MIN, 'minute').toDate(),
      attempts: 0,
      lastSentAt: now,
      lockedUntil: null,
    };
    await user.save();

    try {
      await sendWA(user.phone, otpMessage(code));
    } catch (err) {
      user.otp = {};
      await user.save();
      return res.status(502).json({ message: 'تعذّر إرسال كود التفعيل عبر واتساب. حاول لاحقًا.' });
    }

    return res.status(202).json({ message: 'تم إرسال كود جديد على واتساب.' });
  } catch (e) {
    next(e);
  }
};

// const register = asyncHandler(async (req, res) => {
// const { name, phone, password, role = 'client', salonId } = req.body;
// if (!name || !phone || !password) return res.status(400).json({ message: 'name/phone/password required' });


// const exists = await User.findOne({ phone });
// if (exists) return res.status(409).json({ message: 'Phone already in use' });


// const passwordHash = await bcrypt.hash(password, 10);
// const user = await User.create({ name, phone, passwordHash, role, salonId });


// const at = signAccessToken(user);
// const rt = signRefreshToken(user);
// setRefreshCookie(res, rt);


// res.status(201).json({ accessToken: at, user: { id: user._id, name: user.name, phone: user.phone, role: user.role, salonId: user.salonId } });
// });
const register = asyncHandler(async (req, res) => {
  const { name, phone, password, role , salonId ,gender } = req.body;

  if (!name?.trim() || !phone?.trim() || !password?.trim()) {
    return res.status(400).json({ message: 'name/phone/password required' });
  }

  // تأكد إن الموبايل مش مستخدم قبل كده
  const exists = await User.findOne({ phone: phone.trim() });
  if (exists) return res.status(409).json({ message: 'Phone already in use' });

  // إنشاء المستخدم غير مفعّل هاتفيًا
  const passwordHash = await bcrypt.hash(password, 10);
  const user = await User.create({
    name: name.trim(),
    phone: phone.trim(),
    passwordHash,
    role,
    salonId,
    gender,
    isPhoneVerified: false,
    // isActive: false, // اختياري لو عايز تربط التفعيل الإداري بالتفعيل الهاتفي
  });

  // توليد وتهيئة الـ OTP
  const code = String(Math.floor(100000 + Math.random() * 900000));
  const hash = await bcrypt.hash(code, 10);

  user.otp = {
    hash,
    expiresAt: dayjs().add(OTP_TTL_MIN, 'minute').toDate(),
    attempts: 0,
    lastSentAt: new Date(),
    lockedUntil: null,
  };
  await user.save();

  // إرسال الكود عبر واتساب
  try {
    await sendWA(user.phone, `رمز التفعيل الخاص بك هو: ${code}\nصالح لمدة ${OTP_TTL_MIN} دقيقة. لا تشاركه مع أي شخص.`);
  } catch (err) {
    user.otp = {};
    await user.save();
    return res.status(502).json({ message: 'تعذّر إرسال كود التفعيل عبر واتساب. حاول لاحقًا.' });
  }

  // لا نُصدر توكنات الآن — ننتظر التفعيل
  return res.status(201).json({
    message: 'تم إنشاء الحساب وإرسال كود التفعيل على واتساب.',
    requiresOtp: true,
    userId: user._id,
  });
});


const login = asyncHandler(async (req, res) => {
const { phone, password } = req.body;
const user = await User.findOne({ phone });
if (!user) return res.status(401).json({ message: 'Invalid credentials' });
const ok = await bcrypt.compare(password, user.passwordHash);
if (!ok) return res.status(401).json({ message: 'Invalid credentials' });
if (!user.isActive) return res.status(403).json({ message: 'User inactive' });


const at = signAccessToken(user);
const rt = signRefreshToken(user);
setRefreshCookie(res, rt);
res.json({ accessToken: at, user: { id: user._id, name: user.name, phone: user.phone, role: user.role, salonId: user.salonId } });
});


const me = asyncHandler(async (req, res) => {
res.json({ user: req.user });
});


const refresh = asyncHandler(async (req, res) => {
const token = req.cookies?.rt;
if (!token) return res.status(401).json({ message: 'No refresh token' });
try {
const payload = jwt.verify(token, ENV.JWT_REFRESH_SECRET);
const user = await User.findById(payload.id);
if (!user) return res.status(401).json({ message: 'Invalid refresh token' });
if (user.tokenVersion !== payload.tokenVersion) return res.status(401).json({ message: 'Refresh token revoked' });
const at = signAccessToken(user);
const rt = signRefreshToken(user);
setRefreshCookie(res, rt);
res.json({ accessToken: at });
} catch (e) {
return res.status(401).json({ message: 'Invalid refresh token' });
}
});


const logout = asyncHandler(async (req, res) => {
// نقدر نزود خيار: زيادة tokenVersion لإلغاء كل الـ sessions
clearRefreshCookie(res);
res.json({ ok: true });
});

module.exports = { register, login, me, refresh, logout, resendOtp, verifyOtp };
