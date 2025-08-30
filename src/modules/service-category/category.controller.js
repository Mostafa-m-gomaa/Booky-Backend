const Category = require('./category.model');
const { asyncHandler } = require('../../utils/asyncHandler');


exports.createCategory = asyncHandler(async (req, res) => {
const { name, description } = req.body;
const salonId = req?.query?.salonId;
if (!salonId) return res.status(400).json({ message: 'Salon scope missing' });


const category = await Category.create({
name,
description,
image: req.file?.path,
salonId,
});


res.status(201).json(category);
});


exports.getCategoriesBySalon = asyncHandler(async (req, res) => {
const salonId = req.params.salonId;
const categories = await Category.find({ salonId }).populate('services');
res.json(categories);
});


exports.updateCategory = asyncHandler(async (req, res) => {
const { name, description } = req.body;
const updated = await Category.findByIdAndUpdate(
req.params.id,
{ name, description, image: req.file?.path },
{ new: true }
);
if (!updated) return res.status(404).json({ message: 'Category not found' });
res.json(updated);
});


exports.deleteCategory = asyncHandler(async (req, res) => {
const deleted = await Category.findByIdAndDelete(req.params.id);
if (!deleted) return res.status(404).json({ message: 'Category not found' });
res.json({ message: 'Category deleted successfully' });
});