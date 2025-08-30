const Service = require('./service.model');

const { asyncHandler } = require('../../utils/asyncHandler');


exports.addService = asyncHandler(async (req, res) => {
  const data = req.body;
  const salonId = req?.query?.salonId;

  // التحقق من وجود categoryId
  if (!data.categoryId) {
    return res.status(400).json({ message: 'categoryId is required' });
  }

  // تأكد أن الكاتيجوري تابعة لنفس الصالون
  const categoryExists = await require('../service-category/category.model').findOne({
    _id: data.categoryId,
    salonId
  });

  if (!categoryExists) {
    return res.status(400).json({ message: 'Invalid category for this salon' });
  }

  // إضافة الصور لو فيه
  if (req.files && req.files.length > 0) {
    data.images = req.files.map(file => file.path);
  }

  data.salonId = salonId;
  const s = await Service.create(data);

  res.status(201).json(s);
});



exports.getServices = asyncHandler(async (req, res) => {
  const services = await Service.find({ salonId: req.tenant.salonId }).populate('categoryId', 'name');
  res.json(services);
});


exports.updateService = asyncHandler(async (req, res) => {
  const service = await Service.findOne({
    _id: req.params.id,
    salonId: req.tenant.salonId
  });

  if (!service) return res.status(404).json({ message: 'Service not found' });

  // لو المستخدم بيغير categoryId، نتحقق منها
  if (req.body.categoryId) {
    const categoryExists = await require('../service-category/category.model').findOne({
      _id: req.body.categoryId,
      salonId: req.tenant.salonId
    });

    if (!categoryExists) {
      return res.status(400).json({ message: 'Invalid category for this salon' });
    }
  }

  if (req.files && req.files.length > 0) {
    req.body.images = req.files.map(file => file.path);
  }

  Object.assign(service, req.body);
  await service.save();

  res.json(service);
});




exports.deleteService = asyncHandler(async (req, res) => {
await Service.findOneAndDelete({ _id: req.params.id, salonId: req.tenant.salonId });
res.json({ ok: true });
});