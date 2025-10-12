const mongoose = require("mongoose");
// const { v4: uuidv4 } = require("uuid");
// const sharp = require("sharp");
// const { uploadSingleFile } = require("../../middleware/uploadImage");

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
exports.deleteOne = (req, res, next) => {
  //check if there are subscriptions with this package
  // async delete image of this package
  return factory.deleteOne(Package)(req, res, next);
};
//upload course image
// exports.uploadPackageImage = uploadSingleFile("image");
// //image processing
// exports.resizeImage = async (req, res, next) => {
//   const { file } = req; // Access the uploaded file
//   if (file) {
//     const fileExtension = file.originalname.substring(
//       file.originalname.lastIndexOf(".")
//     ); // Extract file extension
//     const newFileName = `package-${uuidv4()}-${Date.now()}${fileExtension}`; // Generate new file name

//     // Check if the file is an image for the profile picture
//     if (file.mimetype.startsWith("image/")) {
//       // Process and save the image file using sharp for resizing, conversion, etc.
//       const filePath = `uploads/packages/${newFileName}`;

//       await sharp(file.buffer)
//         .toFormat("webp") // Convert to WebP
//         .webp({ quality: 95 })
//         .toFile(filePath);

//       // Update the req.body to include the path for the new  package image
//       req.body.image = newFileName;
//     } else {
//       return next(
//         new ApiError(
//           "Unsupported file type. Only images are allowed for package.",
//           400
//         )
//       );
//     }
//   }
//   next();
// };
const isTheCurrentUserOwnerOfSalonHelper = async (
  ownerId,
  salonId,
  salons = []
) => {
  salons = salons.length > 0 ? salons : await Salons.find({ ownerId });
  const salonIds = salons.map((salon) => salon._id.toString());
  console.log(salonIds, salonId);
  return salonIds.includes(salonId);
};

exports.isTheCurrentUserOwnerOfSalon = async (req, res, next) => {
  console.log("here");
  const package = await Package.findById(req.params.id).select("salon");
  if (!package) {
    return res.status(404).json({ message: "package not found" });
  }
  if (
    req.user.role !== "super-admin" &&
    !(await isTheCurrentUserOwnerOfSalonHelper(
      req.user._id,
      package.salon.toString()
    ))
  ) {
    return res
      .status(403)
      .json({ message: "you are not the owner of this salon" });
  }
  return next();
};
