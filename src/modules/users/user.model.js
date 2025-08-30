const mongoose = require('mongoose');
const { Schema } = mongoose;


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
  startTime: String, // hh:mm
  endTime: String,
  isActive: { type: Boolean, default: true }
}
},
{ timestamps: true }
);


UserSchema.index({ role: 1, salonId: 1 });


module.exports = mongoose.model('User', UserSchema);