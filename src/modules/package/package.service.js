const mongoose = require("mongoose");

const ApiError = require("../../utils/apiError");
const factory = require("../../utils/handlerFactory");
const Package = require("./package.model");
const Salons = require("../salons/salon.model");
const UserSubscription = require("../subscription/subscription.model");

exports.filterInstructorPackages = async (req, res, next) => {
  const filter = {};
  const { salonId } = req.query;
  if (req.user.role == "super-admin") {
    if (salonId) {
      filter.salon = salonId;
    }
  } else if (req.user.role === "owner") {
    const salons = await Salons.find({ ownerId: req.user._id });
    const salonIds = salons.map((salon) => salon._id);
    if (salonId) {
      if (!salonIds.includes(salonId)) {
        return next(
          new ApiError("you are not allowed to access this salon", 403)
        );
      }
      filter.salon = salonId;
    } else {
      filter.salon = { $in: salonIds };
    }
  }
  req.filterObj = filter;
  return next();
};
//@desc get list of collections
//@route GET /api/v1/collections
//@access public
exports.filterPackages = async (req, res, next) => {
  req.filterObj = { salon: req.params.salonId, status: "active" };
  return next();
};
exports.getAll = factory.getAll(Package, "Package");
//@desc get specific collection by id
//@route GET /api/v1/collections/:id
//@access public
exports.getOne = factory.getOne(Package);

//@desc create collection
//@route POST /api/v1/collections
//@access private
exports.createOne = async (req, res, next) => {
  req.body.creator = req.user._id;
  return factory.createOne(Package)(req, res, next);
};

//@desc update specific collection
//@route PUT /api/v1/collections/:id
//@access private
exports.updateOne = factory.updateOne(Package);

//@desc delete collection
//@route DELETE /api/v1/collections/:id
//@access private
exports.deleteOne = async (req, res, next) => {
  try {
    await mongoose.connection.transaction(async (session) => {
      // Find and delete the course
      const package = await Package.findByIdAndDelete(req.params.id).session(
        session
      );

      // Check if course exists
      if (!package) {
        return next(
          new ApiError(`package not found for this id ${req.params.id}`, 404)
        );
      }

      // Delete associated lessons and reviews
      await Promise.all([
        UserSubscription.deleteMany({ package: package._id }).session(session),
        Post.deleteMany({
          package: { $elemMatch: { $eq: package._id } },
        }).session(session),
      ]);
    });

    // Return success response
    res.status(204).send();
  } catch (error) {
    // Handle any transaction-related errors

    if (error instanceof ApiError) {
      // Forward specific ApiError instances
      return next(error);
    }
    // Handle other errors with a generic message
    return next(new ApiError("Error during course deletion", 500));
  }
};
