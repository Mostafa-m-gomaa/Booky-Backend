const router = require("express").Router();

router.use("/auth", require("../modules/auth/auth.routes"));
router.use("/users", require("../modules/users/user.routes"));
router.use("/salons", require("../modules/salons/salon.routes"));
router.use("/services", require("../modules/services/service.routes"));
router.use("/bookings", require("../modules/booking/booking.routes"));
router.use(
  "/categories",
  require("../modules/service-category/category.routes")
);
router.use("/feedback", require("../modules/feedback/feedback.router"));
router.use(
  "/employee-feedback",
  require("../modules/employeeFeedback/employeeFeedback.routes")
);
router.use("/coupons", require("../modules/coupons/coupon.routes"));
router.use("/packages", require("../modules/package/package.route"));
router.use(
  "/subscription",
  require("../modules/subscription/subscription.route")
);
router.use("/notifications", require("../modules/notifications/notification.routes"));
router.use("/category-types", require("../modules/category-types/catTypes.routes"));

module.exports = router;
