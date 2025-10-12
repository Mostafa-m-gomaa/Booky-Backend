const Feedback = require('./feedback.model');
const Booking = require('../booking/booking.model');
const { asyncHandler } = require('../../utils/asyncHandler');
const handlerFactory = require('../../utils/handlerFactory');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// ✅ تعديل: storage يفصل المجلد حسب mimetype
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    let uploadDir;
    if (file.mimetype.startsWith('image/')) {
      uploadDir = path.join(__dirname, '../../../uploads/feedbacks/images');
    } else if (file.mimetype.startsWith('video/')) {
      uploadDir = path.join(__dirname, '../../../uploads/feedbacks/videos');
    } else {
      return cb(new ApiError('Invalid file type', 400));
    }
    
    // إنشاء المجلد لو مش موجود
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, `feedback-${Date.now()}-${file.originalname}`);  // اسم فريد
  }
});

const upload = multer({ 
  storage, 
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/') || file.mimetype.startsWith('video/')) {
      cb(null, true);
    } else {
      cb(new ApiError('Only images and videos allowed', 400), false);
    }
  },
  limits: { fileSize: 10 * 1024 * 1024 }  // 10MB max
});

// ✅ تعديل: createFeedback (زي ما هو، بس بدون mediaPaths، وفصل images/videos)
exports.createFeedback = [
  upload.array('media', 5),  // يدعم حتى 5 ملفات
  asyncHandler(async (req, res) => {
    const { bookingId, rating, comment } = req.body;

    // ✅ فصل الـ files حسب النوع (الـ paths هتكون صح دلوقتي بسبب الـ storage)
    const images = req.files ? req.files
      .filter(file => file.mimetype.startsWith('image/'))
      .map(file => `/uploads/feedbacks/images/${file.filename}`) : [];
    
    const videos = req.files ? req.files
      .filter(file => file.mimetype.startsWith('video/'))
      .map(file => `/uploads/feedbacks/videos/${file.filename}`) : [];

    const booking = await Booking.findOne({ _id: bookingId, clientId: req.user._id });
    if (!booking) return res.status(404).json({ message: 'Booking not found or not yours' });

    if (booking.status !== 'completed') {
      return res.status(400).json({ message: 'You can only review completed bookings' });
    }

    const existing = await Feedback.findOne({ bookingId });
    if (existing) return res.status(400).json({ message: 'You already submitted feedback for this booking' });

    const feedback = await Feedback.create({
      bookingId,
      salonId: booking.salonId,
      clientId: req.user._id,
      rating,
      comment,
      images,  // ✅ حفظ paths الصور
      videos   // ✅ حفظ paths الفيديوهات
    });

    res.status(201).json(feedback);
  })
];
exports.authorizeFeedbackOwner = async (req, res, next) => {
  try {
    const { feedbackId } = req.params;
    const feedback = await Feedback.findById(feedbackId).select('client'); // أو الحقل اللي بيخزن اليوزر
    if (!feedback) {
      return next(new ApiError(`No feedback for id ${feedbackId}`, 404));
    }

    // req.user._id ممكن يكون ObjectId، فا نستخدم equals أو toString
    if (feedback.clientId.equals(req.user._id) || req.user?.role === 'super-admin') {
      // المالك فعلاً
      return next();
    }

    return next(new ApiError('You are not allowed to delete this feedback', 403));
  } catch (err) {
    return next(err);
  }
}

// ✅ إنشاء فيدباك بعد انتهاء الحجز
// exports.createFeedback = asyncHandler(async (req, res) => {
//   const { bookingId, rating, comment } = req.body;

//   const booking = await Booking.findOne({ _id: bookingId, clientId: req.user._id });
//   if (!booking) return res.status(404).json({ message: 'Booking not found or not yours' });

//   if (booking.status !== 'completed') {
//     return res.status(400).json({ message: 'You can only review completed bookings' });
//   }

//   const existing = await Feedback.findOne({ bookingId });
//   if (existing) return res.status(400).json({ message: 'You already submitted feedback for this booking' });

//   const feedback = await Feedback.create({
//     bookingId,
//     salonId: booking.salonId,
//     clientId: req.user._id,
//     rating,
//     comment,
//   });

//   res.status(201).json(feedback);
// });
// ✅ تعديل: إنشاء فيدباك مع media upload
// exports.createFeedback = [
//   upload.array('media', 5),  // ✅ جديد: يدعم حتى 5 ملفات (صور/فيديوهات)
//   asyncHandler(async (req, res) => {
//     const { bookingId, rating, comment } = req.body;
// const images = req.files ? req.files.filter(file => file.mimetype.startsWith('image/')).map(file => `/uploads/feedbacks/images/${file.filename}`) : [];
// const videos = req.files ? req.files.filter(file => file.mimetype.startsWith('video/')).map(file => `/uploads/feedbacks/videos/${file.filename}`) : [];
//     const booking = await Booking.findOne({ _id: bookingId, clientId: req.user._id });
//     if (!booking) return res.status(404).json({ message: 'Booking not found or not yours' });

//     if (booking.status !== 'completed') {
//       return res.status(400).json({ message: 'You can only review completed bookings' });
//     }

//     const existing = await Feedback.findOne({ bookingId });
//     if (existing) return res.status(400).json({ message: 'You already submitted feedback for this booking' });

//     // ✅ جديد: جمع paths الـ media
//     const mediaPaths = req.files ? req.files.map(file => `/uploads/feedbacks/${file.filename}`) : [];

//     const feedback = await Feedback.create({
//       bookingId,
//       salonId: booking.salonId,
//       clientId: req.user._id,
//       rating,
//       comment,
//       images,  // حفظ paths الصور
//       videos   // حفظ paths الفيديوهات
//     });

//     res.status(201).json(feedback);
//   })
// ];
// ✅ جديد: إضافة reply على feedback (للـ admin أو salon owner)
exports.addReply = asyncHandler(async (req, res) => {
  const { feedbackId } = req.params;
  const { text } = req.body;

  if (!text || text.trim().length < 5) {
    return res.status(400).json({ message: 'Reply text must be at least 5 characters' });
  }

  const feedback = await Feedback.findById(feedbackId);
  if (!feedback) {
    return res.status(404).json({ message: 'Feedback not found' });
  }

  feedback.replies.push({
    text: text.trim(),
    repliedBy: req.user._id
  });
  await feedback.save();

  res.status(200).json({ 
    success: true, 
    data: { reply: feedback.replies[feedback.replies.length - 1] } 
  });
});
exports.getAllFeedbacks = handlerFactory.getAll(Feedback);
exports.getFeedback = handlerFactory.getOne(Feedback, 'clientId');
exports.updateFeedback = handlerFactory.updateOne(Feedback);
exports.deleteFeedback = handlerFactory.deleteOne(Feedback);
