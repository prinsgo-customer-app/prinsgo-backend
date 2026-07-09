const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    message: { type: String, required: true },
    audience: { type: String, enum: ['all_customers', 'all_drivers', 'single_customer', 'single_driver'], required: true },
    targetId: { type: mongoose.Schema.Types.ObjectId, default: null },
    sentCount: { type: Number, default: 0 },
    failedCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Notification', notificationSchema);
