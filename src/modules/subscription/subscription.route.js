const express = require("express");

const subscriptionService = require("./subscription.service");
const { requireAuth } = require("../../middleware/auth");
const { requireRole } = require("../../lib/rbac/requireRole");

const router = express.Router();

router
  .route("/")
  .get(
    requireAuth,
    subscriptionService.filterUserPackages,
    subscriptionService.getMySubscriptions
  );
router
  .route("/:id") //pcakege id
  .post(
    requireAuth,
    requireRole(["admin"]),

    subscriptionService.AddsubscriberToCollection
  );

module.exports = router;
