const express = require('express');
const router = express.Router();
const { requireAuth } = require('../../middleware/auth');  // أو auth بتاعك
const notificationController = require('./notification.controller');

// كل routes محتاجة auth
router.use(requireAuth);

router.get('/unread', notificationController.getUnreadNotifications);
router.get('/', notificationController.getNotifications);
router.patch('/:notificationId/read', notificationController.markAsRead);
router.patch('/read-all', notificationController.markAllAsRead);

module.exports = router;