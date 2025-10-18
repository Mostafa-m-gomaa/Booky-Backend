const express = require("express");

const subscriptionService = require("./subscription.service");
const { requireAuth } = require("../../middleware/auth");
const { requireRole } = require("../../lib/rbac/requireRole");

const router = express.Router();

router.get(
  "/getPackageSubscriptions/:id",
  requireAuth,
  subscriptionService.filterSubscriptionsByPackage,
  subscriptionService.getAll
);

router
  .route("/")
  .get(
    requireAuth,
    requireRole(["super-admin", "client"]),
    subscriptionService.filterUserPackages,
    subscriptionService.getMySubscriptions
  )
  .post(
    requireAuth,
    requireRole(["admin", "super-admin", "owner"]),
    subscriptionService.createSubscriptions
  );

router
  .route("/:id")
  .get(requireAuth, subscriptionService.getOne)
  .delete(
    requireAuth,
    requireRole(["super-admin", "admin", "owner"]),
    subscriptionService.deleteOne
  );

module.exports = router;
