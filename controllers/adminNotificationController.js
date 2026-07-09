const User = require('../models/User');
const Driver = require('../models/Driver');
const Notification = require('../models/Notification');
const { sendFcmBulk, sendFcmNotification } = require('../utils/fcmService');

// @desc    Broadcast a notification to all customers, all drivers, or a specific user
// @route   POST /api/admin/notifications/broadcast
// @access  Private (admin)
const broadcastNotification = async (req, res, next) => {
  try {
    const { title, message, audience, targetId } = req.body;

    if (!title || !message || !audience) {
      return res.status(400).json({ success: false, message: 'title, message, and audience are required' });
    }

    const validAudiences = ['all_customers', 'all_drivers', 'single_customer', 'single_driver'];
    if (!validAudiences.includes(audience)) {
      return res.status(400).json({ success: false, message: 'Invalid audience type' });
    }

    let sentCount = 0;
    let failedCount = 0;

    if (audience === 'all_customers') {
      const users = await User.find({ fcmToken: { $ne: '' } }).select('fcmToken');
      const result = await sendFcmBulk(users.map((u) => u.fcmToken), title, message);
      sentCount = result.sentCount;
      failedCount = result.failedCount;
    } else if (audience === 'all_drivers') {
      const drivers = await Driver.find({ fcmToken: { $ne: '' } }).select('fcmToken');
      const result = await sendFcmBulk(drivers.map((d) => d.fcmToken), title, message);
      sentCount = result.sentCount;
      failedCount = result.failedCount;
    } else if (audience === 'single_customer') {
      const user = await User.findById(targetId);
      if (!user) return res.status(404).json({ success: false, message: 'Customer not found' });
      const result = await sendFcmNotification(user.fcmToken, title, message);
      sentCount = result.success ? 1 : 0;
      failedCount = result.success ? 0 : 1;
    } else if (audience === 'single_driver') {
      const driver = await Driver.findById(targetId);
      if (!driver) return res.status(404).json({ success: false, message: 'Driver not found' });
      const result = await sendFcmNotification(driver.fcmToken, title, message);
      sentCount = result.success ? 1 : 0;
      failedCount = result.success ? 0 : 1;
    }

    const log = await Notification.create({
      title,
      message,
      audience,
      targetId: targetId || null,
      sentCount,
      failedCount,
    });

    res.status(200).json({ success: true, message: 'Notification broadcast complete', log });
  } catch (error) {
    next(error);
  }
};

// @desc    Get notification broadcast history
// @route   GET /api/admin/notifications/history
// @access  Private (admin)
const getNotificationHistory = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;

    const notifications = await Notification.find()
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    const total = await Notification.countDocuments();

    res.status(200).json({ success: true, notifications, page, totalPages: Math.ceil(total / limit), total });
  } catch (error) {
    next(error);
  }
};

module.exports = { broadcastNotification, getNotificationHistory };
