const express = require('express');
const router = express.Router();
const { protectCustomer } = require('../middleware/auth');
const {
  getMyNotifications,
  getUnreadCount,
  markAsRead,
} = require('../controllers/notificationController');

// All customer notification routes require authentication
router.use(protectCustomer);

router.get('/', getMyNotifications);
router.get('/unread-count', getUnreadCount);
router.put('/:id/read', markAsRead);

module.exports = router;
