// src/modules/users/user.controller.js
const bcrypt = require('bcryptjs');
const User = require('./user.model');
const Salon = require('../salons/salon.model');
const { asyncHandler } = require('../../utils/asyncHandler');

// ───────────────────────── helpers / guards ─────────────────────────
async function assertOwnerOwnsSalon(ownerId, salonId) {
  const salon = await Salon.findOne({ _id: salonId, ownerId: ownerId });
  if (!salon) {
    const err = new Error('You do not own this salon');
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
  const users = await User.find().limit(200).lean().select('-passwordHash');
  res.json({ users });
});

const listMySalon = asyncHandler(async (req, res) => {
  const salonId = req.tenant?.salonId;
  if (!salonId) return res.status(400).json({ message: 'No tenant scope' });

  // owner/admin/barber/specialist (التحقق في الراوتر)
  const users = await User.find({ salonId }).limit(200).lean().select('-passwordHash');
  res.json({ users });
});

// اختيارية: للـ owner اللي عنده أكتر من صالون أو للـ admin
const listBySalonId = asyncHandler(async (req, res) => {
  const { salonId } = req.params;

  if (req.user.role === 'owner') {
    await assertOwnerOwnsSalon(req.user.id, salonId);
  } else if (req.user.role === 'admin') {
    if (!sameSalon(req.user.salonId, salonId)) {
      return res.status(403).json({ message: 'Admin can only access his salon' });
    }
  }
  const users = await User.find({ salonId }).lean().select('-passwordHash');
  res.json({ users });
});

// ───────────────────────── self endpoints ─────────────────────────
const getMe = asyncHandler(async (req, res) => {
  const me = await User.findById(req.user.id).select('-passwordHash').lean();
  res.json(sanitize(me));
});

const updateMe = asyncHandler(async (req, res) => {
  const allowed = ['name', 'email', 'phone', 'avatar'];
  const patch = {};
  for (const k of allowed) if (k in req.body) patch[k] = req.body[k];

  // ممنوع تغيير role أو salonId من هنا
  const updated = await User.findByIdAndUpdate(req.user.id, patch, { new: true })
    .select('-passwordHash');
  res.json(sanitize(updated));
});

// ───────────────────────── avatar (image) ─────────────────────────
const updateProfilePicture = asyncHandler(async (req, res) => {
  const targetUserId = req.params.id;
  const target = await User.findById(targetUserId);
  if (!target) return res.status(404).json({ message: 'User not found' });

  // من المسموح؟
  // 1) صاحب الأكاونت نفسه
  // 2) owner يملك صالونه
  // 3) admin في نفس الصالون
  let allowed = req.user.id === targetUserId;
  if (!allowed && req.user.role === 'owner') {
    await assertOwnerOwnsSalon(req.user.id, target.salonId);
    allowed = true;
  } else if (!allowed && req.user.role === 'admin') {
    allowed = sameSalon(req.user.salonId, target.salonId);
  }
  if (!allowed) return res.status(403).json({ message: 'Forbidden' });

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
    return res.status(400).json({ message: 'name, phone, password, salonId are required' });
  }
  await assertOwnerOwnsSalon(req.user.id, salonId);

  const passwordHash = await bcrypt.hash(password, 10);
  const admin = await User.create({
    name, phone, email, passwordHash,
    role: 'admin',
    salonId,
    isActive: true,
  });
  res.status(201).json(sanitize(admin));
});

// POST /employees  (owner/admin)
const createEmployee = asyncHandler(async (req, res) => {
  const { name, phone, email, password, salonId, role = 'barber', employeeData } = req.body;

  if (!name || !phone || !password || !salonId) {
    return res.status(400).json({ message: 'name, phone, password, salonId are required' });
  }
  if (!['barber', 'specialist'].includes(role)) {
    return res.status(400).json({ message: 'role must be barber or specialist' });
  }

  if (req.user.role === 'owner') {
    await assertOwnerOwnsSalon(req.user.id, salonId);
  } else if (req.user.role === 'admin') {
    if (!sameSalon(req.user.salonId, salonId)) {
      return res.status(403).json({ message: 'Admin can only create staff in his salon' });
    }
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const employee = await User.create({
    name, phone, email, passwordHash,
    role,
    salonId,
    isActive: true,
    employeeData: {
      services: employeeData?.services || [],
      workingDays: employeeData?.workingDays || [],
      startTime: employeeData?.startTime || '10:00',
      endTime: employeeData?.endTime || '18:00',
      isActive: true,
    },
  });

  res.status(201).json(sanitize(employee));
});

// ───────────────────────── updates (team) ─────────────────────────
const updateEmployeeSchedule = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { startTime, endTime, workingDays } = req.body;

  const employee = await User.findById(id);
  if (!employee) return res.status(404).json({ message: 'User not found' });
  if (!['barber', 'specialist'].includes(employee.role)) {
    return res.status(400).json({ message: 'User is not an employee' });
  }

  if (req.user.role === 'owner') {
    await assertOwnerOwnsSalon(req.user.id, employee.salonId);
  } else if (req.user.role === 'admin') {
    if (!sameSalon(req.user.salonId, employee.salonId)) {
      return res.status(403).json({ message: 'Forbidden' });
    }
  }

  employee.employeeData = employee.employeeData || {};
  if (startTime) employee.employeeData.startTime = startTime;
  if (endTime) employee.employeeData.endTime = endTime;
  if (workingDays) employee.employeeData.workingDays = workingDays;

  await employee.save();
  res.json(sanitize(employee));
});

const updateEmployeeServices = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { services } = req.body; // array of ServiceIds

  const employee = await User.findById(id);
  if (!employee) return res.status(404).json({ message: 'User not found' });
  if (!['barber', 'specialist'].includes(employee.role)) {
    return res.status(400).json({ message: 'User is not an employee' });
  }

  if (req.user.role === 'owner') {
    await assertOwnerOwnsSalon(req.user.id, employee.salonId);
  } else if (req.user.role === 'admin') {
    if (!sameSalon(req.user.salonId, employee.salonId)) {
      return res.status(403).json({ message: 'Forbidden' });
    }
  }

  employee.employeeData = employee.employeeData || {};
  employee.employeeData.services = services || [];
  await employee.save();

  res.json(sanitize(employee));
});

// owner فقط
const updateUserRole = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { role } = req.body; // admin | barber | specialist | client

  const user = await User.findById(id);
  if (!user) return res.status(404).json({ message: 'User not found' });

  await assertOwnerOwnsSalon(req.user.id, user.salonId);

  if (!['admin', 'barber', 'specialist', 'client'].includes(role)) {
    return res.status(400).json({ message: 'Invalid role' });
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
  if (!user) return res.status(404).json({ message: 'User not found' });

  if (req.user.role === 'owner') {
    await assertOwnerOwnsSalon(req.user.id, user.salonId);
  } else if (req.user.role === 'admin') {
    if (!sameSalon(req.user.salonId, user.salonId)) {
      return res.status(403).json({ message: 'Forbidden' });
    }
  }

  user.isActive = !!isActive;
  await user.save();
  res.json(sanitize(user));
});

// ───────────────────────── exports ─────────────────────────
module.exports = {
  // listing
  list, listMySalon, listBySalonId,

  // self
  getMe, updateMe,

  // image
  updateProfilePicture,

  // create
  createAdmin, createEmployee,

  // updates
  updateEmployeeSchedule, updateEmployeeServices,
  updateUserRole, toggleUserActive,
};
