const UserNotification = require('../models/UserNotification');

// @desc    Get customer notifications
// @route   GET /api/notifications
// @access  Private (customer)
const getMyNotifications = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;

    const notifications = await UserNotification.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    const total = await UserNotification.countDocuments({ user: req.user._id });

    res.status(200).json({
      success: true,
      notifications,
      page,
      totalPages: Math.ceil(total / limit),
      total,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get count of unread notifications
// @route   GET /api/notifications/unread-count
// @access  Private (customer)
const getUnreadCount = async (req, res, next) => {
  try {
    const count = await UserNotification.countDocuments({ user: req.user._id, isRead: false });
    res.status(200).json({ success: true, count });
  } catch (error) {
    next(error);
  }
};

// @desc    Mark a notification as read
// @route   PUT /api/notifications/:id/read
// @access  Private (customer)
const markAsRead = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (id === 'all') {
      await UserNotification.updateMany({ user: req.user._id, isRead: false }, { isRead: true });
      return res.status(200).json({ success: true, message: 'All notifications marked as read' });
    }

    const notification = await UserNotification.findOne({ _id: id, user: req.user._id });

    if (!notification) {
      return res.status(404).json({ success: false, message: 'Notification not found' });
    }

    notification.isRead = true;
    await notification.save();

    res.status(200).json({ success: true, message: 'Notification marked as read', notification });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getMyNotifications,
  getUnreadCount,
  markAsRead,
};
