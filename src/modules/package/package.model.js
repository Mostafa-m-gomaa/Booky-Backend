const mongoose = require("mongoose");

//**
// @desc : each package avail users to attend (lives) only , not any thing else
// @desc : each package is related to one course only
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

    title: { type: String, required: true },
    description: { type: String, required: true },
    slug: {
      type: String,
      required: true,
      lowercase: true,
    },
    timesToUse: {
      type: Number,
      required: true,
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
    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "inactive",
    },
    type: {
      type: String,
      enum: ["service", "course"],
      default: "service",
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

  next();
});

module.exports = mongoose.model("Package", packageSchema);
