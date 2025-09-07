const Service = require("./service.model");
const handlerFactory = require("../../utils/handlerFactory");
const { asyncHandler } = require("../../utils/asyncHandler");

exports.prepareCreateService = (req, _res, next) => {
  if (req.files && req.files.length > 0) {
    // هترفع بصيغة paths؛ لو عندك util للـ full URL استخدمه هنا بدل file.path
    req.body.images = req.files.map(f => f.path);
  }
  if (!req.body.salonId && req.tenant?.salonId) {
    req.body.salonId = req.tenant.salonId;
  }
  next();
};

exports.prepareUpdateService = (req, _res, next) => {
  if (req.files && req.files.length > 0) {
    req.body.images = req.files.map(f => f.path);
  }
  // ممنوع تغيير salonId في الابديت (اختياري): احذف أي salonId جاي من العميل
  if (req.body.salonId) delete req.body.salonId;
  next();
};

exports.addService = handlerFactory.createOne(Service);

exports.getServices = handlerFactory.getAll(Service);

exports.updateService = handlerFactory.updateOne(Service);

exports.deleteService = handlerFactory.deleteOne(Service);

exports.getService = handlerFactory.getOne(Service);

