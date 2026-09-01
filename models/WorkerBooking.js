const mongoose = require('mongoose');

const locationSchema = new mongoose.Schema(
  {
    address: { type: String, required: true },
    lat: { type: Number, required: true },
    lng: { type: Number, required: true },
  },
  { _id: false }
);

const workerBookingSchema = new mongoose.Schema(
  {
    customer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    worker: { type: mongoose.Schema.Types.ObjectId, ref: 'Driver', default: null }, // 'Driver' schema holds partner profile
    category: { type: mongoose.Schema.Types.ObjectId, ref: 'WorkerCategory', required: true },

    location: { type: locationSchema, required: true },
    date: { type: Date, required: true },
    time: { type: String, required: true },
    taskDescription: { type: String, required: true },
    attachments: [{ type: String }],

    pricing: {
      basePrice: { type: Number, required: true },
      platformFee: { type: Number, default: 0 },
      totalAmount: { type: Number, required: true },
    },

    paymentMethod: { type: String, enum: ['cash', 'upi', 'wallet'], default: 'cash' },
    paymentStatus: { type: String, enum: ['pending', 'paid', 'failed'], default: 'pending' },

    status: {
      type: String,
      enum: [
        'pending',
        'accepted',
        'on_the_way',
        'arrived',
        'in_progress',
        'completed',
        'cancelled',
        'rejected',
      ],
      default: 'pending',
    },

    cancelReason: { type: String, default: '' },
    cancelledBy: { type: String, enum: ['customer', 'worker', 'admin', ''], default: '' },

    requestedAt: { type: Date, default: Date.now },
    acceptedAt: { type: Date },
    startedAt: { type: Date }, // corresponds to 'in_progress'
    completedAt: { type: Date },

    couponCode: { type: String, default: null },
    discount: { type: Number, default: 0 },
    finalAmount: { type: Number, default: null }, // Final amount actually paid, handles coupon discount

    customerRating: { type: Number, min: 1, max: 5 },
    customerReview: { type: String, default: '' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('WorkerBooking', workerBookingSchema);
