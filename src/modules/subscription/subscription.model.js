const mongoose = require("mongoose");

const userSubscriptionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    package: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Package",
      required: true,
    },
    timesToUse: {
      type: Number,
    },
    timesUsed: {
      type: Number,
    },
  },
  { timestamps: true }
);
// userSubscriptionSchema.pre(/^find/, function (next) {
//   this.populate({
//     path: "package",
//     select: "title course subscriptionDurationDays type",
//   });
//   next();
// });
module.exports = mongoose.model("UserSubscription", userSubscriptionSchema);
