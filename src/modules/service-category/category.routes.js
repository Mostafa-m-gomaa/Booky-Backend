const router = require("express").Router();
const upload = require("../../middleware/upload");
const { requireAuth } = require("../../middleware/auth");
const { tenantScope } = require("../../lib/rbac/tenantScope");
const { requireRole } = require("../../lib/rbac/requireRole");
const ctrl = require("./category.controller");

router.post(
  "/",
  requireAuth,
  tenantScope,
  requireRole(["owner", "admin"]),
  upload.single("image"),
  ctrl.createCategory
);
router.get("/:salonId", requireAuth, ctrl.getCategoriesBySalon);
router.put(
  "/:id",
  requireAuth,
  requireRole(["owner", "admin"]),
  upload.single("image"),
  ctrl.updateCategory
);
router.delete(
  "/:id",
  requireAuth,
  requireRole(["owner", "admin"]),
  ctrl.deleteCategory
);

module.exports = router;
