const { body, check } = require("express-validator");
const slugify = require("slugify");
const validatorMiddleware = require("../../middleware/validatorMiddleware");
const ApiError = require("../../utils/apiError");
const Salon = require("../salons/salon.model");

exports.createPackageValidator = [
  // Title (now string)
  check("title")
    .isString()
    .withMessage("Title must be a string.")
    .isLength({ min: 3 })
    .withMessage("Title must be at least 3 characters.")
    .custom((val, { req }) => {
      req.body.slug = slugify(val);
      return true;
    }),

  // Description (now string)
  check("description")
    .isString()
    .withMessage("Description must be a string.")
    .isLength({ min: 10 })
    .withMessage("Description must be at least 10 characters."),

  // timesToUse
  check("timesToUse")
    .notEmpty()
    .withMessage("timesToUse is required")
    .isInt({ min: 1 })
    .withMessage("timesToUse must be a positive integer"),

  // price
  check("price")
    .notEmpty()
    .withMessage("Price is required")
    .isNumeric()
    .withMessage("Price must be a number")
    .isFloat({ max: 200000 })
    .withMessage("Price must not exceed 200000"),

  // priceAfterDiscount
  check("priceAfterDiscount")
    .optional()
    .isNumeric()
    .withMessage("priceAfterDiscount must be a number")
    .custom((value, { req }) => {
      if (value >= req.body.price) {
        throw new ApiError("priceAfterDiscount must be less than price", 400);
      }
      return true;
    }),

  // status
  check("status")
    .optional()
    .isIn(["active", "inactive"])
    .withMessage("Status must be either active or inactive"),

  // type
  check("type")
    .optional()
    .isIn(["service", "course"])
    .withMessage("Type must be either service or course"),

  // course (required if type is "course")
  body("salon")
    .notEmpty()
    .isMongoId()
    .withMessage("Invalid salon ID")
    .custom(async (value, { req }) => {
      const { res } = req;
      const salon = await Salon.findById(value);
      if (!salon) {
        throw new ApiError("this salon not found ", 403);
      }
      return true;
    }),

  validatorMiddleware,
];

exports.updatePackageValidator = [
  check("title")
    .optional()
    .isString()
    .withMessage("Title must be a string.")
    .isLength({ min: 3 })
    .withMessage("Title must be at least 3 characters.")
    .custom((val, { req }) => {
      req.body.slug = slugify(val);
      return true;
    }),

  // Description (now string)
  check("description")
    .optional()
    .isString()
    .withMessage("Description must be a string.")
    .isLength({ min: 10 })
    .withMessage("Description must be at least 10 characters."),

  // timesToUse
  check("timesToUse")
    .optional()
    .isInt({ min: 1 })
    .withMessage("timesToUse must be a positive integer"),

  // price
  check("price")
    .optional()
    .isNumeric()
    .withMessage("Price must be a number")
    .isFloat({ max: 200000 })
    .withMessage("Price must not exceed 200000"),

  // priceAfterDiscount
  check("priceAfterDiscount")
    .optional()
    .isNumeric()
    .withMessage("priceAfterDiscount must be a number")
    .custom((value, { req }) => {
      if (value >= req.body.price) {
        throw new ApiError("priceAfterDiscount must be less than price", 400);
      }
      return true;
    }),

  // status
  check("status")
    .optional()
    .isIn(["active", "inactive"])
    .withMessage("Status must be either active or inactive"),

  // type
  check("type")
    .optional()
    .isIn(["service", "course"])
    .withMessage("Type must be either service or course"),

  // course (required if type is "course")
  body("salon")
    .optional()
    .isMongoId()
    .withMessage("Invalid salon ID")
    .custom(async (value, { req }) => {
      const { res } = req;
      const salon = await Salon.findById(value);
      if (!salon) {
        throw new ApiError("this salon not found ", 403);
      }
      return true;
    }),
  validatorMiddleware,
];

exports.packageIdValidator = [
  check("id").isMongoId().withMessage("invalid id formate"),
  validatorMiddleware,
];

// exports.checkPackageAuthority = async (req, res, next) => {
//   const { packageId } = req.params;
//   const { user } = req;
//   const subscription = await Subscription.findOne({
//     user: user._id,
//     package: packageId,
//   });
//   if (!subscription) {
//     return next(apiError("you are not subscribed", 401));
//   }
//   const bool = new Date(subscription.endDate).getTime() <= new Date().getTime();

//   if (bool) {
//     return next(apiError("your subscription has expired", 401));
//   }
//   return next();
// };
