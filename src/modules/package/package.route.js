const express = require("express");

const {
  createPackageValidator,
  updatePackageValidator,
  packageIdValidator,
} = require("./package.validator");
const packageService = require("./package.service");
const { requireAuth } = require("../../middleware/auth");
const { requireRole } = require("../../lib/rbac/requireRole");

const router = express.Router();

// for admin and instructors
router.get(
  "/",
  requireAuth,
  requireRole(["admin", "super-admin", "owner"]),
  packageService.filterInstructorPackages,
  packageService.getAll
);

//get package for specific salon
// user portal
router
  .route("/:salonId")
  .get(packageService.filterPackages, packageService.getAll);

router.post(
  "/",
  requireAuth,
  requireRole(["admin", "super-admin", "owner"]),
  createPackageValidator,
  packageService.createOne
);

router.route("/getOne/:id").get(packageIdValidator, packageService.getOne);
router
  .route("/:id")
  .patch(
    requireAuth,
    requireRole(["admin", "super-admin", "owner"]),
    packageService.isTheCurrentUserOwnerOfSalon,
    packageIdValidator,
    updatePackageValidator,
    packageService.updateOne
  )
  .delete(
    requireAuth,
    requireRole(["admin", "super-admin", "owner"]),
    packageIdValidator,
    packageService.isTheCurrentUserOwnerOfSalon,
    packageService.deleteOne
  );

module.exports = router;
