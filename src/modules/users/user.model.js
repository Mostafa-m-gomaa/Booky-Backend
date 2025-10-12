const mongoose = require("mongoose");
const { Schema } = mongoose;

const DayShiftSchema = new Schema(
  {
    start: { type: String, match: /^\d{2}:\d{2}$/ }, // "HH:mm"
    end: { type: String, match: /^\d{2}:\d{2}$/ }, // "HH:mm"
  },
  { _id: false }
);

const WeeklyScheduleSchema = new Schema(
  {
    sun: { type: [DayShiftSchema], default: [] },
    mon: { type: [DayShiftSchema], default: [] },
    tue: { type: [DayShiftSchema], default: [] },
    wed: { type: [DayShiftSchema], default: [] },
    thu: { type: [DayShiftSchema], default: [] },
    fri: { type: [DayShiftSchema], default: [] },
    sat: { type: [DayShiftSchema], default: [] },
  },
  { _id: false }
);

const EmployeeBlockSchema = new Schema(
  {
    // one-off: حدّد date  •  weekly: حدّد dayOfWeek (0..6)
    date: { type: Date }, // اختياري (للـ one-off)
    dayOfWeek: { type: Number, min: 0, max: 6 }, // للـ weekly
    wholeDay: { type: Boolean, default: false },
    start: { type: String, match: /^\d{2}:\d{2}$/ }, // اختياري لو wholeDay=true
    end: { type: String, match: /^\d{2}:\d{2}$/ }, // اختياري لو wholeDay=true
    repeat: { type: String, enum: ["none", "weekly"], default: "none" },
    reason: { type: String },
    active: { type: Boolean, default: true },
  },
  { _id: true }
);

const OtpSchema = new Schema(
  {
    hash: { type: String },
    expiresAt: { type: Date },
    attempts: { type: Number, default: 0 },
    lastSentAt: { type: Date },
    lockedUntil: { type: Date },
  },
  { _id: false }
);

const UserSchema = new Schema(
  {
    salonId: { type: Schema.Types.ObjectId, ref: "Salon" }, // for employees
    name: { type: String, required: true },
    email: { type: String, index: true, sparse: true },
    passwordHash: { type: String, required: true },
    phone: { type: String, required: true, unique: true },
    gender: { type: String, enum: ["male", "female"] },
    avatar: { type: String },
    role: {
      type: String,
      required: true,
      enum: ["super-admin", "owner", "admin", "barber", "specialist", "client"],
      default: "client",
    },
    isPhoneVerified: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    activatedAt: { type: Date },

    otp: { type: OtpSchema, default: {} },
    otps: {
      register: { type: OtpSchema, default: {} },
      reset: { type: OtpSchema, default: {} },
    },
    tokenVersion: { type: Number, default: 0 },
    resetTokenHash: { type: String },
    resetTokenExpires: { type: Date },

    noShowCount: { type: Number, default: 0 },
wishlist: [{ type: Schema.Types.ObjectId, ref: 'Salon' }],
    employeeData: {
      services: [{ type: Schema.Types.ObjectId, ref: "Service" }],
      // workingDays: [{ type: String, enum: ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] }],
      weeklySchedule: {
        type: WeeklyScheduleSchema,
        default: () => ({
          sun: [],
          mon: [],
          tue: [],
          wed: [],
          thu: [],
          fri: [],
          sat: [],
        }),
      },
      blocks: { type: [EmployeeBlockSchema], default: [] },
      // startTime: String, // hh:mm
      // endTime: String,
      isActive: { type: Boolean, default: true },
    },
  },
  { timestamps: true }
);

UserSchema.methods.toJSON = function () {
  const obj = this.toObject();

  // Function to remove sensitive fields
  const removeSensitiveFields = (fields) => {
    fields.forEach((field) => delete obj[field]);
  };

  // Define sensitive fields
  const sensitiveFields = [
    "passwordChangedAt",
    "passwordResetCode",
    "passwordResetExpires",
    "passwordHash",
    "otps",
    "otp",
  ];

  // Remove common sensitive fields
  removeSensitiveFields(sensitiveFields);

  return obj;
};

UserSchema.index({ role: 1, salonId: 1 });

module.exports = mongoose.model("User", UserSchema);
