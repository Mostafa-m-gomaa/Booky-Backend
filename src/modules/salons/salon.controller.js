// const Salon = require('./salon.model');
// const User = require('../users/user.model');
// const Category = require('../service-category/category.model');
// const Service = require('../services/service.model');
// const SalonFeedback = require('../feedback/feedback.model');
// const EmployeeFeedback = require('../employeeFeedback/employeeFeedback.model');

// const { asyncHandler } = require('../../utils/asyncHandler');

// // إضافة صالون جديد
// exports.createSalon = asyncHandler(async (req, res) => {
//   const { name, type, address, phone, location, openingHours } = req.body;
//   const images = req.files.map(file => file.path);

//   let parsedOpeningHours = [];
//   try {
//     parsedOpeningHours = JSON.parse(openingHours);
//   } catch (error) {
//     return res.status(400).json({ message: 'Invalid format for openingHours. Must be JSON array.' });
//   }

//   const salon = await Salon.create({
//     name,
//     type,
//     address,
//     phone,
//     location,
//     openingHours: parsedOpeningHours, // ✅ هنا التعديل
//     images,
//     ownerId: req.user.id
//   });

//   res.status(201).json(salon);
// });


// // عرض الصالونات الخاصة بالمستخدم
// exports.getMySalons = asyncHandler(async (req, res) => {
//   const salons = await Salon.find({ ownerId: req.user.id });
//   res.json(salons);
// });

// // تعديل صالون
// exports.updateSalon = asyncHandler(async (req, res) => {
//   const salon = await Salon.findOne({ _id: req.params.id, ownerId: req.user.id });
//   if (!salon) return res.status(404).json({ message: 'Salon not found' });

//   // استخراج الصور الجديدة إن وجدت
//   if (req.files && req.files.length > 0) {
//     req.body.images = req.files.map(file => file.path);
//   }

//   Object.assign(salon, req.body);
//   await salon.save();

//   res.json(salon);
// });


// // حذف صالون
// exports.deleteSalon = asyncHandler(async (req, res) => {
//   const salon = await Salon.findOneAndDelete({
//     _id: req.params.id,
//     ownerId: req.user.id
//   });

//   if (!salon) return res.status(404).json({ message: 'Salon not found' });

//   res.json({ ok: true });
// });


// exports.getAllSalons = asyncHandler(async (req, res) => {
//   const salons = await Salon.find({}).select('name type location rating images');
//   res.json(salons);
// });


// exports.getSalonDetails = asyncHandler(async (req, res) => {
//   const salonId = req.params.id;

//   const salon = await Salon.findById(salonId).lean();
//   if (!salon) return res.status(404).json({ message: 'Salon not found' });

//   // الموظفين داخل الصالون
//   const employees = await User.find({ salonId, role: { $in: ['barber', 'specialist'] } })
//     .select('name avatar role employeeData')
//     .lean();

//   // التقييمات على الموظفين
//   const feedbacks = await EmployeeFeedback.find({ employeeId: { $in: employees.map(e => e._id) } })
//     .populate('clientId', 'name avatar')
//     .lean();

//   // تجميع التقييمات للموظفين
//   const employeeRatings = {};
//   feedbacks.forEach(f => {
//     if (!employeeRatings[f.employeeId]) employeeRatings[f.employeeId] = [];
//     employeeRatings[f.employeeId].push({ rating: f.rating, comment: f.comment, client: f.clientId });
//   });

//   // ضيف الريفيوهات للموظفين
//   const employeesWithReviews = employees.map(e => ({
//     ...e,
//     reviews: employeeRatings[e._id] || [],
//   }));

//   // كاتيجوريز الصالون
//   const categories = await Category.find({ salonId }).lean();

//   // الخدمات المرتبطة بالكاتيجوريز
//   const services = await Service.find({ salonId }).lean();

//   const categoriesWithServices = categories.map(cat => ({
//     ...cat,
//     services: services.filter(s => s.category?.toString() === cat._id.toString()),
//   }));

//   // التقييمات العامة للصالون (لو فيه)
//   const salonFeedbacks = await SalonFeedback.find({ salonId }).populate('clientId', 'name avatar').lean();

//   res.json({
//     ...salon,
//     employees: employeesWithReviews,
//     categories: categoriesWithServices,
//     reviews: salonFeedbacks || [],
//   });
// });


const Salon = require('./salon.model');
const User = require('../users/user.model');
const Category = require('../service-category/category.model');
const Service = require('../services/service.model');
const SalonFeedback = require('../feedback/feedback.model');
const EmployeeFeedback = require('../employeeFeedback/employeeFeedback.model');

const handlerFactory = require('../../utils/handlerFactory');
const { asyncHandler } = require('../../utils/asyncHandler');

// ✅ إنشاء صالون جديد (له منطق خاص بالصورة وفتح الأوقات)
exports.createSalon = asyncHandler(async (req, res) => {
  const { name, type, address, phone, location, openingHours } = req.body;
  const images = req.files.map(file => file.path);

  let parsedOpeningHours = [];
  try {
    parsedOpeningHours = JSON.parse(openingHours);
  } catch (error) {
    return res.status(400).json({ message: 'Invalid format for openingHours. Must be JSON array.' });
  }

  const salon = await Salon.create({
    name,
    type,
    address,
    phone,
    location,
    openingHours: parsedOpeningHours,
    images,
    ownerId: req.user.id
  });

  res.status(201).json(salon);
});

// ✅ تعديل صالون (له منطق خاص بالصور)
exports.updateSalon = asyncHandler(async (req, res) => {
  const salon = await Salon.findOne({ _id: req.params.id, ownerId: req.user.id });
  if (!salon) return res.status(404).json({ message: 'Salon not found' });

  if (req.files && req.files.length > 0) {
    req.body.images = req.files.map(file => file.path);
  }

  Object.assign(salon, req.body);
  await salon.save();

  res.json(salon);
});

// ✅ حذف صالون مخصص للمالك فقط
exports.deleteSalon = asyncHandler(async (req, res) => {
  const salon = await Salon.findOneAndDelete({
    _id: req.params.id,
    ownerId: req.user.id
  });

  if (!salon) return res.status(404).json({ message: 'Salon not found' });

  res.json({ ok: true });
});

// ✅ getMySalons (صالونات المالك فقط)
exports.getMySalons = asyncHandler(async (req, res) => {
  const salons = await Salon.find({ ownerId: req.user.id });
  res.json(salons);
});

// ✅ getAll (باستخدام handlerFactory)
exports.getAllSalons = handlerFactory.getAll(Salon);

// ✅ getOne (لو عايز تفاصيل صالون بسيط)
exports.getOneSalon = handlerFactory.getOne(Salon);

// ✅ getSalonDetails (مخصص فيه منطق مخصص بالتجميع)
exports.getSalonDetails = asyncHandler(async (req, res) => {
  const salonId = req.params.id;

  const salon = await Salon.findById(salonId).lean();
  if (!salon) return res.status(404).json({ message: 'Salon not found' });

  const employees = await User.find({ salonId, role: { $in: ['barber', 'specialist'] } })
    .select('name avatar role employeeData')
    .lean();

  const feedbacks = await EmployeeFeedback.find({ employeeId: { $in: employees.map(e => e._id) } })
    .populate('clientId', 'name avatar')
    .lean();

  const employeeRatings = {};
  feedbacks.forEach(f => {
    if (!employeeRatings[f.employeeId]) employeeRatings[f.employeeId] = [];
    employeeRatings[f.employeeId].push({ rating: f.rating, comment: f.comment, client: f.clientId });
  });

  const employeesWithReviews = employees.map(e => ({
    ...e,
    reviews: employeeRatings[e._id] || [],
  }));

  const categories = await Category.find({ salonId }).lean();
  const services = await Service.find({ salonId }).lean();

  const categoriesWithServices = categories.map(cat => ({
    ...cat,
    services: services.filter(s => s.category?.toString() === cat._id.toString()),
  }));

  const salonFeedbacks = await SalonFeedback.find({ salonId })
    .populate('clientId', 'name avatar')
    .lean();

  res.json({
    ...salon,
    employees: employeesWithReviews,
    categories: categoriesWithServices,
    reviews: salonFeedbacks || [],
  });
});
