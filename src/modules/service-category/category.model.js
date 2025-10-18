// src/modules/categories/category.model.js
const mongoose = require('mongoose');
const { Schema } = mongoose;

const CategorySchema = new Schema({
  name: { type: String, required: true },
  description: { type: String },
  image: { type: String }, // لو عايز أيقونة أو صورة للعرض
  salonId: { type: Schema.Types.ObjectId, ref: 'Salon', required: true },
  services: [{ type: Schema.Types.ObjectId, ref: 'Service' }] ,
  catType : {type : Schema.Types.ObjectId , ref : 'CatType' , required : true}
}, { timestamps: true });

module.exports = mongoose.model('Category', CategorySchema);
