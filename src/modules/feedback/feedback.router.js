const router = require('express').Router();
const controller = require('./feedback.controller');
const { requireAuth } = require('../../middleware/auth');
const { requireRole } = require('../../lib/rbac/requireRole');



router.post('/', controller.createFeedback);
router.get('/',  controller.getAllFeedbacks);

router
  .route('/:feedbackId')
  .get(controller.getFeedback)
  .put(controller.authorizeFeedbackOwner,controller.updateSalonAvgRating, controller.updateFeedback)
  .delete(controller.authorizeFeedbackOwner, controller.deleteFeedback);

router.post('/:feedbackId/reply', requireRole('admin', 'salon-owner'), controller.addReply);

module.exports = router;
