const mongoose = require("mongoose");

//**
// @desc : we handle package subscription in userSubscriptionModel.js
// **/
const packageSchema = new mongoose.Schema(
  {
    creator: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    salon: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Salon",
    },
    services: [{ type: mongoose.Schema.Types.ObjectId, ref: "Service" }],
    title: { type: String, required: true },
    description: { type: String, required: true },
    slug: {
      type: String,
      lowercase: true,
    },
    timesToUse: {
      type: Number,
    },
    price: {
      type: Number,
      required: [true, "Package price is required"],
      trim: true,
      max: [200000, "Too long Course price"],
    },
    priceAfterDiscount: {
      type: Number,
    },
    image: String,
    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "inactive",
    },
    type: {
      type: String,
      enum: ["bundle", "membership"],
    },
  },
  { timestamps: true }
);
// ^find => it mean if part of of teh word contains find
packageSchema.pre(/^find/, function (next) {
  // this => query
  this.populate({
    path: "creator",
    select: "name email phone role",
  });
  this.populate({
    path: "services",
    select: "name price",
  });

  next();
});

module.exports = mongoose.model("Package", packageSchema);
