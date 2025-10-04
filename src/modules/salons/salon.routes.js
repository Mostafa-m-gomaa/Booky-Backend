const router = require("express").Router();
const { requireAuth } = require("../../middleware/auth");
const { requireRole } = require("../../lib/rbac/requireRole");
const upload = require("../../middleware/upload");
const controller = require("./salon.controller");

// ───────────── Public routes (بدون تسجيل دخول) ─────────────

router.get(
  "/",
  (req, res, next) => {
    req.filterObj = { isActive: true };
  },
  controller.getAllSalons
);
//for dashboard
router.get(
  "/getAll",
  requireAuth,
  (req, res, next) => {
    if (req.user.role === "owner") {
      req.filterObj = { ownerId: req.user._id };
    }
  },
  controller.getAllSalons
);

router.get("/:id/details", controller.getSalonDetails);

router.get("/:id", controller.getOneSalon);

// ───────────── Protected routes (للمالك) ─────────────
router.use(requireAuth);

// صالوناتي أنا (المالك)
// router.get("/owner/my", requireRole(["owner"]), controller.getMySalons);

// إنشاء صالون جديد (مالك فقط)
router.post(
  "/",
  requireRole(["owner", "super-admin"]),
  upload.array("images", 10),
  controller.createSalon
);

// تعديل صالون (مالك فقط)
router.put(
  "/:id",
  requireRole(["owner", "super-admin"]),
  upload.array("images", 10),
  controller.updateSalon
);

// حذف صالون (مالك فقط)
router.delete(
  "/:id",
  requireRole(["owner", "super-admin"]),
  controller.deleteSalon
);

router.post(
  "/:id/toggle-active",
  requireRole(["superadmin"]),
  controller.toggleSalonActive
);

module.exports = router;
