const router = require("express").Router();
const { requireAuth } = require("../../middleware/auth");
const { tenantScope } = require("../../lib/rbac/tenantScope");
const { requireRole } = require("../../lib/rbac/requireRole");
const upload = require("../../middleware/upload");

const {
  // listing
  list,
  listMySalon,
  listBySalonId,
  // create
  createAdmin,
  createEmployee,
  // updates
  updateEmployeeSchedule,
  updateEmployeeServices,
  updateUserRole,
  toggleUserActive,
  updateProfilePicture,

  // blocks (NEW)
  listEmployeeBlocks,
  addEmployeeBlock,
  deleteEmployeeBlock,

  // self
  getMe,
  updateMe,
  forgotPassword,
  verifyResetOtp,
  resetPassword,
  deleteUserFromSalon,
  //new
  getUser,
  getUsers,
  filterUsersBasedOnRole,
} = require("./user.controller");

// ───────────────────────────────────────────────────────────
// Auth required for all routes
router.post('/forgot-password', forgotPassword);
router.post('/password/verify-otp', verifyResetOtp);
router.post('/password/reset', resetPassword);
router.use(requireAuth);

// Self info
router.get("/me", getMe);
router.put("/me", updateMe);

// Profile image (self allowed; owner/admin may update users in same salon - checked in controller)
router.put("/:id/image", upload.single("image"), updateProfilePicture);

// ───────────────────────────────────────────────────────────
// Tenant-scoped routes
router.use(tenantScope);

// Super Admin — list all users
router.get(
  "/",
  requireRole(["super-admin", "owner", "admin"]),
  filterUsersBasedOnRole,
  getUsers
);

// Current tenant members
// router.get(
//   "/my-salon",
//   requireRole(["owner", "admin", "barber", "super-admin"]),
//   listMySalon
// );
router.delete(
  "/salons/:salonId/users/:id",
  requireRole(["super-admin", "owner", "admin"]),
  deleteUserFromSalon
);

// (Optional) list by explicit salonId (owner/admin)
// router.get(
//   "/by-salon/:salonId",
//   requireRole(["owner", "admin", "super-admin"]),
//   listBySalonId
// );

// Create Admin (owner only)
router.post("/admins", requireRole(["owner", "super-admin"]), createAdmin);

// Create Employee (owner/admin)
router.post(
  "/employees",
  requireRole(["owner", "admin", "super-admin"]),
  createEmployee
);

// ───────────────── Employee Management ─────────────────
// ✅ Update employee schedule (allow self employee + owner/admin)
router.put(
  "/:id/employee/schedule",
  requireRole(["owner", "admin", "barber", "super-admin"]),
  updateEmployeeSchedule
);

// Update employee services (owner/admin)
router.put(
  "/:id/employee/services",
  requireRole(["owner", "admin", "super-admin"]),
  updateEmployeeServices
);

// ✅ Blocks management (employee self + owner/admin)
router.get(
  "/:id/employee/blocks",
  requireRole(["owner", "admin", "barber", "super-admin"]),
  listEmployeeBlocks
);
router.post(
  "/:id/employee/blocks",
  requireRole(["owner", "admin", "barber", "super-admin"]),
  addEmployeeBlock
);
router.delete(
  "/:id/employee/blocks/:blockId",
  requireRole(["owner", "admin", "barber", "super-admin"]),
  deleteEmployeeBlock
);

// Role & Status
router.put(
  "/:id/role",
  requireRole(["owner", "admin", "super-admin"]),
  updateUserRole
);
router.put(
  "/:id/status",
  requireRole(["owner", "admin", "super-admin"]),
  toggleUserActive
);

module.exports = router;
