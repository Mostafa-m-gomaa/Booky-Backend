// // const router = require('express').Router();
// // const { requireAuth } = require('../../middleware/auth');
// // const { tenantScope } = require('../../lib/rbac/tenantScope');
// // const { requireRole } = require('../../lib/rbac/requireRole');
// // const { list, listMySalon ,updateProfilePicture } = require('./user.controller');
// // const upload = require('../../middleware/upload');

// // router.get('/', requireAuth, requireRole(['super-admin']), list);
// // router.get('/my-salon', requireAuth, tenantScope, requireRole(['owner','admin','barber','specialist']), listMySalon);
// // router.put('/:id/image', upload.single('image'), updateProfilePicture);


// // module.exports = router;

// const router = require('express').Router();
// const { requireAuth } = require('../../middleware/auth');
// const { tenantScope } = require('../../lib/rbac/tenantScope');
// const { requireRole } = require('../../lib/rbac/requireRole');
// const upload = require('../../middleware/upload');

// const {
//   // listing
//   list, listMySalon, listBySalonId,

//   // create
//   createAdmin, createEmployee,

//   // updates
//   updateEmployeeSchedule, updateEmployeeServices,
//   updateUserRole, toggleUserActive,
//   updateProfilePicture,

//   // self
//   getMe, updateMe,
// } = require('./user.controller');

// // ───────────────────────────────────────────────────────────
// // Public-ish (لازم Auth في كل المسارات هنا)
// router.use(requireAuth);

// // معلوماتي
// router.get('/me', getMe);
// router.put('/me', updateMe);

// // صورة البروفايل: المصرّح له يغيّر صورته بنفسه
// // ولو Owner/Admin يقدر يغيّر صورة أي حد في نفس الصالون (هنتحقق في الcontroller)
// router.put('/:id/image', upload.single('image'), updateProfilePicture);

// // ───────────────────────────────────────────────────────────
// // إدارة الفريق (داخل صالون معيّن)
// // مبدئيًا: أي مسار مرتبط بكيان داخل الصالون يمر بـ tenantScope أولًا
// router.use(tenantScope);

// // Owner فقط يجيب كل المستخدمين في النظام (لو محتاجها)
// router.get('/', requireRole(['super-admin']), list);

// // أعضاء الصالون الحالي من خلال الـ tenant
// router.get('/my-salon', requireRole(['owner','admin','barber','specialist']), listMySalon);

// // (اختياري) لو عايز تجيب بالsalonId صريح (مثلاً للـ owner عنده أكتر من صالون)
// router.get('/by-salon/:salonId', requireRole(['owner','admin']), listBySalonId);

// // إنشاء Admin (Owner فقط)
// router.post('/admins', requireRole(['owner']), createAdmin);

// // إنشاء Employee (Owner/Admin)
// router.post('/employees', requireRole(['owner','admin']), createEmployee);

// // تعديل شِفتات الموظف (Owner/Admin)
// router.put('/:id/employee/schedule', requireRole(['owner','admin']), updateEmployeeSchedule);

// // تعديل خدمات الموظف (Owner/Admin)
// router.put('/:id/employee/services', requireRole(['owner','admin']), updateEmployeeServices);

// // تغيير الدور (Owner فقط)
// router.put('/:id/role', requireRole(['owner']), updateUserRole);

// // تفعيل/تعطيل المستخدم (Owner/Admin)
// router.put('/:id/status', requireRole(['owner','admin']), toggleUserActive);

// module.exports = router;


const router = require('express').Router();
const { requireAuth } = require('../../middleware/auth');
const { tenantScope } = require('../../lib/rbac/tenantScope');
const { requireRole } = require('../../lib/rbac/requireRole');
const upload = require('../../middleware/upload');

const {
  // listing
  list, listMySalon, listBySalonId,

  // create
  createAdmin, createEmployee,

  // updates
  updateEmployeeSchedule, updateEmployeeServices,
  updateUserRole, toggleUserActive,
  updateProfilePicture,

  // blocks (NEW)
  listEmployeeBlocks, addEmployeeBlock, deleteEmployeeBlock,

  // self
  getMe, updateMe,
} = require('./user.controller');

// ───────────────────────────────────────────────────────────
// Auth required for all routes
router.use(requireAuth);

// Self info
router.get('/me', getMe);
router.put('/me', updateMe);

// Profile image (self allowed; owner/admin may update users in same salon - checked in controller)
router.put('/:id/image', upload.single('image'), updateProfilePicture);

// ───────────────────────────────────────────────────────────
// Tenant-scoped routes
router.use(tenantScope);

// Super Admin — list all users
router.get('/', requireRole(['super-admin']), list);

// Current tenant members
router.get('/my-salon', requireRole(['owner','admin','barber','specialist']), listMySalon);

// (Optional) list by explicit salonId (owner/admin)
router.get('/by-salon/:salonId', requireRole(['owner','admin']), listBySalonId);

// Create Admin (owner only)
router.post('/admins', requireRole(['owner']), createAdmin);

// Create Employee (owner/admin)
router.post('/employees', requireRole(['owner','admin']), createEmployee);

// ───────────────── Employee Management ─────────────────
// ✅ Update employee schedule (allow self employee + owner/admin)
router.put('/:id/employee/schedule', requireRole(['owner','admin','barber','specialist']), updateEmployeeSchedule);

// Update employee services (owner/admin)
router.put('/:id/employee/services', requireRole(['owner','admin']), updateEmployeeServices);

// ✅ Blocks management (employee self + owner/admin)
router.get('/:id/employee/blocks',    requireRole(['owner','admin','barber','specialist']), listEmployeeBlocks);
router.post('/:id/employee/blocks',   requireRole(['owner','admin','barber','specialist']), addEmployeeBlock);
router.delete('/:id/employee/blocks/:blockId', requireRole(['owner','admin','barber','specialist']), deleteEmployeeBlock);

// Role & Status
router.put('/:id/role',   requireRole(['owner']), updateUserRole);
router.put('/:id/status', requireRole(['owner','admin']), toggleUserActive);

module.exports = router;
