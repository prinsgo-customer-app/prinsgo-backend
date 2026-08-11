const mongoose = require('mongoose');

const couponSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
    },
    description: {
      type: String,
      default: '',
    },
    discountType: {
      type: String,
      enum: ['percentage', 'fixed'],
      default: 'percentage',
    },
    discountValue: {
      type: Number,
      required: true,
      min: 0,
    },
    minOrderAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    maxDiscountAmount: {
      type: Number,
      default: 0,
      min: 0, // 0 means no limit
    },
    expiryDate: {
      type: Date,
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    usageLimit: {
      type: Number,
      default: 0, // 0 means unlimited total uses
      min: 0,
    },
    usedCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    userUsageLimit: {
      type: Number,
      default: 1, // limit of uses per customer
      min: 1,
    },
    eligibleService: {
      type: String,
      enum: ['ride', 'parcel', 'all'],
      default: 'all',
    },
    userUsage: [
      {
        userId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
          required: true,
        },
        usedCount: {
          type: Number,
          default: 0,
          min: 0,
        },
        _id: false,
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model('Coupon', couponSchema);
