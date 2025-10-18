const Package = require("../package/package.model");
const Subscription = require("./subscription.model");
const ApiError = require("../../utils/apiError");
const factory = require("../../utils/handlerFactory");
const Salons = require("../salons/salon.model");

//@desc : add subscriber to collection manually
exports.createSubscriptions = async (req, res, next) => {
  const { user, packageId } = req.body;

  const package = await Package.findById(packageId);
  if (!package) {
    return next(new ApiError("Package Not Found", 404));
  }
  if (package.type !== "membership") {
    return next(new ApiError("package's type is not membership", 400));
  }

  const subscription = await Subscription.create({
    user,
    package: packageId,
    timesToUse: package.timesToUse,
    timesUsed: 0,
  });
  return res.status(201).json({ status: "success", subscription });
};

exports.filterUserPackages = async (req, res, next) => {
  let filterObject = {};
  if (req.user.role === "client") filterObject = { user: req.user._id };
  req.filterObj = filterObject;
  next();
};
exports.filterSubscriptionsByPackage = async (req, res, next) => {
  const packageId = req.params.id;
  const package = await Package.findById(packageId);
  if (!package) {
    return next(new ApiError("Package Not Found", 404));
  }

  req.filterObj = { package: packageId };
  next();
};

exports.getMySubscriptions = factory.getAll(Subscription);

//-----------------------
exports.checkUserSubscription = async (user, course = null) => {
  const filter = {
    user: user._id,
  };
  let courseTitle;

  if (course) {
    const package = await Package.findOne({ course: course }).select(
      "_id course"
    );
    if (!package) {
      throw new Error(`no package exists for courseId: ${course}`);
    }
    filter.package = package._id;
    courseTitle = package.course?.title?.en;

    const packageSubscription = await Subscription.findOne(filter);
    if (!packageSubscription) {
      throw new Error(
        `you are not subscribed to package for course ${courseTitle}`
      );
    }
    const now = new Date();
    if (packageSubscription.endDate.getTime() < now) {
      const errMessage = `your subscribtion to package for course ${courseTitle} has expired`;
      throw new Error(errMessage);
    }
  } else {
    const allUserSubscribtions = await Subscription.find({
      user: user._id,
    }).sort({
      endDate: -1,
    });

    if (allUserSubscribtions.length === 0) {
      throw new Error(`you are not subscribed to any package`);
    }
    const lastSubscription = allUserSubscribtions[0];
    const now = new Date();
    if (lastSubscription.endDate.getTime() < now) {
      const errMessage = `your lastSubscription has been expired`;
      throw new Error(errMessage);
    }
  }
  return true; // Valid subscription found
};

exports.deleteOne = factory.deleteOne(Subscription);

exports.getOne = factory.getOne(Subscription);

exports.getAll = factory.getAll(Subscription);
//680d051cf1cfb2c30b2b1497  delete all chats related to this package
// you can not do this , because chat related with course Not package

/**
 * get all subscriptions for admin and super-admin
 * get all subscriptions for specific package   || validate that this package is belong to actor
 * get mySubscriptions for user
 */

/**
 * if user used subscription in reservation ,if he canceled it , will his point be back to him ?
 * how user will subscribe to package ?
 */
