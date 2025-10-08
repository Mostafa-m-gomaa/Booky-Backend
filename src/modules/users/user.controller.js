// src/modules/users/user.controller.js
const bcrypt = require("bcryptjs");
const User = require("./user.model");
const Salon = require("../salons/salon.model");
const { asyncHandler } = require("../../utils/asyncHandler");
const dayjs = require("dayjs");
const {
  sendOtp,
  verifyOtp: verifyGenericOtp,
  issueResetToken,
} = require("../../utils/otp.service");
const factory = require("../../utils/handlerFactory");

// ───────────────────────── helpers / guards ─────────────────────────
async function assertOwnerOwnsSalon(ownerId, salonId) {
  const salon = await Salon.findOne({ _id: salonId, ownerId: ownerId });
  if (!salon) {
    const err = new Error("You do not own this salon");
    err.status = 403;
    throw err;
  }
}

function sameSalon(a, b) {
  return a?.toString() === b?.toString();
}

function sanitize(user) {
  if (!user) return user;
  const obj = user.toObject ? user.toObject() : user;
  delete obj.passwordHash;
  return obj;
}

// ───────────────────────── listing ─────────────────────────
const list = asyncHandler(async (req, res) => {
  // super-admin فقط (التحقق في الراوتر)
  const users = await User.find().limit(200).lean().select("-passwordHash");
  res.json({ users });
});

const listMySalon = asyncHandler(async (req, res) => {
  const salonId = req.tenant?.salonId;
  if (!salonId) return res.status(400).json({ message: "No tenant scope" });

  // owner/admin/barber/specialist (التحقق في الراوتر)
  const users = await User.find({ salonId })
    .limit(200)
    .lean()
    .select("-passwordHash");
  res.json({ users });
});

// اختيارية: للـ owner اللي عنده أكتر من صالون أو للـ admin
const listBySalonId = asyncHandler(async (req, res) => {
  const { salonId } = req.params;

  if (req.user.role === "owner") {
    await assertOwnerOwnsSalon(req.user._id, salonId);
  } else if (req.user.role === "admin") {
    if (!sameSalon(req.user.salonId, salonId)) {
      return res
        .status(403)
        .json({ message: "Admin can only access his salon" });
    }
  }
  const users = await User.find({ salonId }).lean().select("-passwordHash");
  res.json({ users });
});

// ───────────────────────── self endpoints ─────────────────────────

const updateMe = asyncHandler(async (req, res) => {
  const allowed = ["name", "email", "phone", "avatar"];
  const patch = {};
  for (const k of allowed) if (k in req.body) patch[k] = req.body[k];

  // ممنوع تغيير role أو salonId من هنا
  const updated = await User.findByIdAndUpdate(req.user._id, patch, {
    new: true,
  }).select("-passwordHash");
  res.json(sanitize(updated));
});
const getMe = asyncHandler(async (req, res) => {
  const me = await User.findById(req.user?._id).select("-passwordHash").lean();
  res.json(sanitize(me));
});

// ───────────────────────── avatar (image) ─────────────────────────
const updateProfilePicture = asyncHandler(async (req, res) => {
  const targetUserId = req.params.id;
  const target = await User.findById(targetUserId);
  if (!target) return res.status(404).json({ message: "User not found" });

  // من المسموح؟
  // 1) صاحب الأكاونت نفسه
  // 2) owner يملك صالونه
  // 3) admin في نفس الصالون
  let allowed = req.user._id === targetUserId;
  if (!allowed && req.user.role === "owner") {
    await assertOwnerOwnsSalon(req.user._id, target.salonId);
    allowed = true;
  } else if (!allowed && req.user.role === "admin") {
    allowed = sameSalon(req.user.salonId, target.salonId);
  }
  if (!allowed) return res.status(403).json({ message: "Forbidden" });

  if (req.file) {
    target.avatar = req.file.path; // schema عندك: avatar
    await target.save();
  }
  res.json(sanitize(target));
});

// ───────────────────────── create (team) ─────────────────────────
// POST /admins  (owner فقط)
const createAdmin = asyncHandler(async (req, res) => {
  const { name, phone, email, password, salonId } = req.body;

  if (!name || !phone || !password || !salonId) {
    return res
      .status(400)
      .json({ message: "name, phone, password, salonId are required" });
  }
  await assertOwnerOwnsSalon(req.user._id, salonId);

  const passwordHash = await bcrypt.hash(password, 10);
  const admin = await User.create({
    name,
    phone,
    email,
    passwordHash,
    role: "admin",
    salonId,
    isActive: true,
  });
  res.status(201).json(sanitize(admin));
});

// POST /employees  (owner/admin)
const createEmployee = asyncHandler(async (req, res) => {
  const {
    name,
    phone,
    email,
    password,
    salonId,
    role = "barber",
    employeeData,
  } = req.body;

  if (!name || !phone || !password || !salonId) {
    return res
      .status(400)
      .json({ message: "name, phone, password, salonId are required" });
  }
  if (!["barber", "specialist"].includes(role)) {
    return res
      .status(400)
      .json({ message: "role must be barber or specialist" });
  }

  // الصلاحيات حسب دور المُنشِئ
  if (req.user.role === "owner") {
    await assertOwnerOwnsSalon(req.user._id, salonId);
  } else if (req.user.role === "admin") {
    if (!sameSalon(req.user.salonId, salonId)) {
      return res
        .status(403)
        .json({ message: "Admin can only create staff in his salon" });
    }
  }

  const passwordHash = await bcrypt.hash(password, 10);

  // تطبيع/تحقق بسيط من weeklySchedule (اختياري)
  const normalizeWeekly = (ws = {}) => {
    const days = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
    const out = {};
    for (const d of days) {
      const arr = Array.isArray(ws[d]) ? ws[d] : [];
      out[d] = arr
        .filter(
          (s) => s && typeof s.start === "string" && typeof s.end === "string"
        )
        .map((s) => ({ start: s.start, end: s.end })); // schema هيتأكد من HH:mm
    }
    return out;
  };

  const employee = await User.create({
    name,
    phone,
    email,
    passwordHash,
    role,
    salonId,
    isActive: true,
    employeeData: {
      services: employeeData?.services || [],
      weeklySchedule: normalizeWeekly(employeeData?.weeklySchedule), // ← مهم
      blocks: Array.isArray(employeeData?.blocks) ? employeeData.blocks : [], // ← لو عندك بلوكس
      isActive: employeeData?.isActive ?? true,
    },
  });

  res.status(201).json(sanitize(employee));
});

// ───────────────────────── updates (team) ─────────────────────────
const updateEmployeeSchedule = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { startTime, endTime, workingDays } = req.body;

  const employee = await User.findById(id);
  if (!employee) return res.status(404).json({ message: "User not found" });
  if (!["barber", "specialist"].includes(employee.role)) {
    return res.status(400).json({ message: "User is not an employee" });
  }

  // ✅ السماح للموظف نفسه + المالك/الأدمن لنفس الصالون
  let allowed = req.user._id === id;
  if (!allowed && req.user.role === "owner") {
    await assertOwnerOwnsSalon(req.user._id, employee.salonId);
    allowed = true;
  } else if (!allowed && req.user.role === "admin") {
    allowed = String(req.user.salonId) === String(employee.salonId);
  }
  if (!allowed) return res.status(403).json({ message: "Forbidden" });

  employee.employeeData = employee.employeeData || {};
  if (startTime) employee.employeeData.startTime = startTime;
  if (endTime) employee.employeeData.endTime = endTime;
  if (Array.isArray(workingDays))
    employee.employeeData.workingDays = workingDays;

  await employee.save();
  res.json(sanitize(employee));
});

// user.controller.js
const updateEmployeeServices = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { services = [] } = req.body;

  const employee = await User.findById(id);
  if (!employee) return res.status(404).json({ message: "User not found" });
  if (!["barber", "specialist"].includes(employee.role))
    return res.status(400).json({ message: "User is not an employee" });

  // صلاحيات (نفس منطقك الحالي)

  // تحقق الصالون
  const svs = await Service.find({ _id: { $in: services } }).select(
    "_id salonId isActive"
  );
  const allSameSalon = svs.every(
    (s) => String(s.salonId) === String(employee.salonId)
  );
  if (!allSameSalon)
    return res
      .status(400)
      .json({ message: "All services must belong to the employee salon" });

  employee.employeeData.services = [
    ...new Set(svs.filter((s) => s.isActive).map((s) => s._id)),
  ];
  await employee.save();
  res.json(sanitize(employee));
});

// owner فقط
const updateUserRole = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { role } = req.body; // admin | barber | specialist | client

  const user = await User.findById(id);
  if (!user) return res.status(404).json({ message: "User not found" });

  await assertOwnerOwnsSalon(req.user._id, user.salonId);

  if (!["admin", "barber", "specialist", "client"].includes(role)) {
    return res.status(400).json({ message: "Invalid role" });
  }

  user.role = role;
  await user.save();
  res.json(sanitize(user));
});

// owner/admin
const toggleUserActive = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { isActive } = req.body;

  const user = await User.findById(id);
  if (!user) return res.status(404).json({ message: "User not found" });

  if (req.user.role === "owner") {
    await assertOwnerOwnsSalon(req.user._id, user.salonId);
  } else if (req.user.role === "admin") {
    if (!sameSalon(req.user.salonId, user.salonId)) {
      return res.status(403).json({ message: "Forbidden" });
    }
  }

  user.isActive = !!isActive;
  await user.save();
  res.json(sanitize(user));
});

// ───────────────────────── blocks (employee time-off / breaks) ─────────────────────────
function isHHMM(v) {
  return /^\d{2}:\d{2}$/.test(v || "");
}

const listEmployeeBlocks = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const target = await User.findById(id).select(
    "role salonId employeeData.blocks"
  );
  if (!target) return res.status(404).json({ message: "User not found" });
  if (!["barber", "specialist"].includes(target.role))
    return res.status(400).json({ message: "User is not an employee" });

  let allowed = req.user._id === id;
  if (!allowed && req.user.role === "owner") {
    await assertOwnerOwnsSalon(req.user._id, target.salonId);
    allowed = true;
  } else if (!allowed && req.user.role === "admin") {
    allowed = String(req.user.salonId) === String(target.salonId);
  }
  if (!allowed) return res.status(403).json({ message: "Forbidden" });

  res.json({ blocks: target.employeeData?.blocks || [] });
});

const addEmployeeBlock = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const target = await User.findById(id);
  if (!target) return res.status(404).json({ message: "User not found" });
  if (!["barber", "specialist"].includes(target.role))
    return res.status(400).json({ message: "User is not an employee" });

  let allowed = req.user._id === id;
  if (!allowed && req.user.role === "owner") {
    await assertOwnerOwnsSalon(req.user._id, target.salonId);
    allowed = true;
  } else if (!allowed && req.user.role === "admin") {
    allowed = String(req.user.salonId) === String(target.salonId);
  }
  if (!allowed) return res.status(403).json({ message: "Forbidden" });

  // يدعم عنصر واحد أو batch عبر { blocks: [...] }
  const incoming = Array.isArray(req.body?.blocks)
    ? req.body.blocks
    : [req.body];

  const normalized = [];
  for (const b of incoming) {
    const wholeDay = !!b.wholeDay;
    const repeat = b.repeat === "weekly" ? "weekly" : "none";

    if (repeat === "weekly") {
      if (
        typeof b.dayOfWeek !== "number" ||
        b.dayOfWeek < 0 ||
        b.dayOfWeek > 6
      ) {
        return res
          .status(400)
          .json({ message: "dayOfWeek (0..6) is required for weekly blocks" });
      }
    } else {
      if (!b.date)
        return res
          .status(400)
          .json({ message: "date is required for one-off blocks" });
    }

    if (!wholeDay) {
      if (!isHHMM(b.start) || !isHHMM(b.end)) {
        return res.status(400).json({ message: "start/end must be HH:mm" });
      }
      // تحقق أن start < end
      const base = dayjs(b.date || dayjs().format("YYYY-MM-DD"));
      const startDT = dayjs(base.format("YYYY-MM-DD") + " " + b.start);
      const endDT = dayjs(base.format("YYYY-MM-DD") + " " + b.end);
      if (!startDT.isBefore(endDT)) {
        return res.status(400).json({ message: "start must be before end" });
      }
    }

    normalized.push({
      date:
        repeat === "none" ? dayjs(b.date).startOf("day").toDate() : undefined,
      dayOfWeek: repeat === "weekly" ? b.dayOfWeek : undefined,
      wholeDay,
      start: wholeDay ? undefined : b.start,
      end: wholeDay ? undefined : b.end,
      repeat,
      reason: b.reason,
      active: true,
    });
  }

  target.employeeData = target.employeeData || {};
  target.employeeData.blocks = target.employeeData.blocks || [];
  for (const n of normalized) target.employeeData.blocks.push(n);

  target.markModified("employeeData.blocks");
  await target.save();

  res.status(201).json({ blocks: target.employeeData.blocks });
});

const deleteEmployeeBlock = asyncHandler(async (req, res) => {
  const { id, blockId } = req.params;
  const target = await User.findById(id);
  if (!target) return res.status(404).json({ message: "User not found" });

  let allowed = req.user._id === id;
  if (!allowed && req.user.role === "owner") {
    await assertOwnerOwnsSalon(req.user._id, target.salonId);
    allowed = true;
  } else if (!allowed && req.user.role === "admin") {
    allowed = String(req.user.salonId) === String(target.salonId);
  }
  if (!allowed) return res.status(403).json({ message: "Forbidden" });

  const blocks = target.employeeData?.blocks || [];
  const i = blocks.findIndex((b) => String(b._id) === String(blockId));
  if (i === -1) return res.status(404).json({ message: "Block not found" });

  blocks.splice(i, 1);
  target.markModified("employeeData.blocks");
  await target.save();

  res.json({ ok: true });
});

const forgotPassword = asyncHandler(async (req, res) => {
  const { phone } = req.body;
  if (!phone) return res.status(400).json({ message: "phone is required" });
  const user = await User.findOne({ phone });
  // لأسباب أمنية: ما نكشفش وجود المستخدم
  if (user) await sendOtp({ user, purpose: "reset" });

  res.json({ ok: true });
});

// POST /auth/password/verify-otp
const verifyResetOtp = asyncHandler(async (req, res) => {
  const { phone, code } = req.body;
  if (!phone || !code)
    return res.status(400).json({ message: "phone and code are required" });

  const user = await User.findOne({ phone });
  if (!user) return res.status(400).json({ message: "Invalid or expired OTP" });

  // نفس الخدمة العامة اللي كتبناها قبل كده
  const verifiedUser = await verifyGenericOtp({
    userId: user._id,
    code,
    purpose: "reset",
  });
  const resetToken = await issueResetToken(verifiedUser);
  res.json({ ok: true, resetToken });
});

// POST /auth/password/reset

const resetPassword = asyncHandler(async (req, res) => {
  const { phone, resetToken, newPassword } = req.body;
  if (!phone || !resetToken || !newPassword) {
    return res
      .status(400)
      .json({ message: "phone, resetToken, newPassword are required" });
  }
  const user = await User.findOne({ phone });
  if (!user || !user.resetTokenHash || !user.resetTokenExpires) {
    return res.status(400).json({ message: "Invalid or expired reset token" });
  }
  if (new Date() > user.resetTokenExpires) {
    user.resetTokenHash = undefined;
    user.resetTokenExpires = undefined;
    await user.save();
    return res
      .status(400)
      .json({ message: "Reset token expired. Request a new OTP." });
  }
  const ok = await bcrypt.compare(String(resetToken), user.resetTokenHash);
  if (!ok) return res.status(400).json({ message: "Invalid reset token" });

  user.passwordHash = await bcrypt.hash(newPassword, 10);
  user.passwordChangedAt = new Date();
  user.resetTokenHash = undefined;
  user.resetTokenExpires = undefined;
  await user.save();

  // إشعار اختياري
  try {
    await sendWA(user.phone, "تم تغيير كلمة المرور بنجاح.");
  } catch (_) {}

  res.json({ ok: true });
});

// ───────────────────────── delete user from salon ─────────────────────────
const deleteUserFromSalon = asyncHandler(async (req, res) => {
  const { salonId, id } = req.params; // id = target user id
  const hard = String(req.query.hard || "").toLowerCase() === "true";

  const target = await User.findById(id);
  if (!target) return res.status(404).json({ message: "User not found" });

  // لازم المستهدف يكون من نفس الصالون اللي في الباث
  if (!sameSalon(target.salonId, salonId)) {
    return res
      .status(400)
      .json({ message: "Target user does not belong to this salon" });
  }

  // صلاحيات المُمثّل
  if (req.user.role === "owner") {
    await assertOwnerOwnsSalon(req.user._id, salonId);
    if (["owner"].includes(target.role)) {
      return res
        .status(403)
        .json({ message: "Owner cannot delete another owner" });
    }
  } else if (req.user.role === "admin") {
    if (!sameSalon(req.user.salonId, salonId)) {
      return res
        .status(403)
        .json({ message: "Admin can only manage users in his salon" });
    }
    if (["owner", "admin"].includes(target.role)) {
      return res
        .status(403)
        .json({ message: "Admin cannot delete owner/admin" });
    }
  } else if (req.user.role !== "super-admin") {
    return res.status(403).json({ message: "Forbidden" });
  }

  // منع حذف نفسك بالخطأ (اختياري)
  if (
    String(req.user._id) === String(target._id) &&
    req.user.role !== "super-admin"
  ) {
    return res
      .status(400)
      .json({ message: "You cannot delete your own account" });
  }

  if (hard) {
    // حذف نهائي
    await User.deleteOne({ _id: target._id });
    return res.json({ ok: true, deleted: true, mode: "hard" });
  }

  // Soft delete (تعطيل المستخدم + إلغاء تفعيله كموظف)
  target.isActive = false;
  target.deactivatedAt = new Date();
  if (target.employeeData) {
    target.employeeData.isActive = false;
  }
  await target.save();

  res.json({ ok: true, deleted: true, mode: "soft", user: sanitize(target) });
});
//----------------------------------------------------------------
const getUsers = factory.getAll(User, "User");

exports.getUser = factory.getOne(User);

const filterUsersBasedOnRole = async (req, res, next) => {
  if (req.user.role === "super-admin") {
    return next();
  } else if (req.user.role === "owner") {
    // get salons of this user
    if (req.query.salonId) {
      req.filterObj = { salonId: req.query.salonId };
      return next();
    } else {
      const salons = await Salon.find({ ownerId: req.user._id }).select("_id");
      const salonIds = salons.map((salon) => salon._id);
      if (salonIds.length === 0) {
        req.filterObj = { salonId: null }; // no salons, return empty
        return next();
      }
      req.filterObj = { salonId: { $in: salonIds } };
    }
  } else if (req.user.role === "admin") {
    req.filterObj = { salonId: req.user.salonId };
  }
  return next();
};
// ───────────────────────── exports ─────────────────────────
module.exports = {
  // listing
  list,
  listMySalon,
  listBySalonId,

  // self
  getMe,
  updateMe,

  // image
  updateProfilePicture,

  // create
  createAdmin,
  createEmployee,

  // updates
  updateEmployeeSchedule,
  updateEmployeeServices,
  updateUserRole,
  toggleUserActive,
  listEmployeeBlocks,
  addEmployeeBlock,
  deleteEmployeeBlock,
  forgotPassword,
  verifyResetOtp,
  resetPassword,
  deleteUserFromSalon,
  filterUsersBasedOnRole,
  getUsers,
};
