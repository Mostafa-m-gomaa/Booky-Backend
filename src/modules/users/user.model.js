const mongoose = require('mongoose');
const { Schema } = mongoose;

const DayShiftSchema = new Schema({
  start: { type: String, match: /^\d{2}:\d{2}$/ }, // "HH:mm"
  end:   { type: String, match: /^\d{2}:\d{2}$/ }, // "HH:mm"
}, { _id: false });

const WeeklyScheduleSchema = new Schema({
  sun: { type: [DayShiftSchema], default: [] },
  mon: { type: [DayShiftSchema], default: [] },
  tue: { type: [DayShiftSchema], default: [] },
  wed: { type: [DayShiftSchema], default: [] },
  thu: { type: [DayShiftSchema], default: [] },
  fri: { type: [DayShiftSchema], default: [] },
  sat: { type: [DayShiftSchema], default: [] },
}, { _id: false });

const EmployeeBlockSchema = new Schema({
  // one-off: حدّد date  •  weekly: حدّد dayOfWeek (0..6)
  date: { type: Date },                 // اختياري (للـ one-off)
  dayOfWeek: { type: Number, min: 0, max: 6 }, // للـ weekly
  wholeDay: { type: Boolean, default: false },
  start: { type: String, match: /^\d{2}:\d{2}$/ }, // اختياري لو wholeDay=true
  end:   { type: String, match: /^\d{2}:\d{2}$/ }, // اختياري لو wholeDay=true
  repeat: { type: String, enum: ['none','weekly'], default: 'none' },
  reason: { type: String },
  active: { type: Boolean, default: true },
}, { _id: true });

const UserSchema = new Schema(
{
name: { type: String, required: true },
avatar: { type: String } ,
email: { type: String, index: true, sparse: true },
phone: { type: String, required: true, unique: true },
passwordHash: { type: String, required: true },
role: { type: String, required: true, enum: ['super-admin','owner','admin','barber','specialist','client'], default: 'client' },
salonId: { type: Schema.Types.ObjectId, ref: 'Salon' },
isActive: { type: Boolean, default: true },
noShowCount: { type: Number, default: 0 },
tokenVersion: { type: Number, default: 0 } ,
employeeData: {
  services: [{ type: Schema.Types.ObjectId, ref: 'Service' }],
  workingDays: [{ type: String, enum: ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] }],
   weeklySchedule: {
  type: WeeklyScheduleSchema,
  default: () => ({ sun:[], mon:[], tue:[], wed:[], thu:[], fri:[], sat:[] })
},

    // ✅ استراحات/بلوكات
    blocks: { type: [EmployeeBlockSchema], default: [] },
  startTime: String, // hh:mm
  endTime: String,
  isActive: { type: Boolean, default: true }
}
},
{ timestamps: true }
);


UserSchema.index({ role: 1, salonId: 1 ,'employeeData.isActive': 1 });


module.exports = mongoose.model('User', UserSchema);