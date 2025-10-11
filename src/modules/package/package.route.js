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
  "/getAll",
  requireAuth,
  requireRole(["admin", "super-admin", "owner"]),
  packageService.filterInstructorPackages,
  packageService.getAll
);

//get package for specific salon
// user portal
router
  .route("/salonId")
  .get(packageService.filterPackages, packageService.getAll)
  .post(
    requireAuth,
    requireRole(["admin", "super-admin", "owner"]),
    createPackageValidator,
    packageService.createOne
  );
router
  .route("/:id")
  .get(packageIdValidator, packageService.getOne)
  .put(
    requireAuth,
    requireRole(["admin", "super-admin", "owner"]),
    packageIdValidator,
    updatePackageValidator,
    packageService.updateOne
  )
  .delete(
    requireAuth,
    requireRole(["admin", "super-admin", "owner"]),
    packageService.deleteOne
  );

module.exports = router;
