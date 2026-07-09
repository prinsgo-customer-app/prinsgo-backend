const mongoose = require('mongoose');

const locationSchema = new mongoose.Schema(
  {
    address: { type: String, required: true },
    lat: { type: Number, required: true },
    lng: { type: Number, required: true },
    contactName: { type: String, required: true },
    contactPhone: {
      type: String,
      required: true,
      match: [/^[6-9]\d{9}$/, 'Enter a valid 10-digit Indian mobile number'],
    },
  },
  { _id: false }
);

const parcelSchema = new mongoose.Schema(
  {
    customer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    driver: { type: mongoose.Schema.Types.ObjectId, ref: 'Driver', default: null },

    pickup: { type: locationSchema, required: true },
    drop: { type: locationSchema, required: true },

    parcelType: {
      type: String,
      enum: ['document', 'food', 'electronics', 'clothing', 'fragile', 'other'],
      required: true,
    },
    weightCategory: {
      type: String,
      enum: ['upto_1kg', 'upto_5kg', 'upto_10kg', 'upto_20kg'],
      required: true,
    },

    distanceKm: { type: Number, required: true },
    durationMin: { type: Number, required: true },

    charges: {
      baseCharge: { type: Number, required: true },
      distanceCharge: { type: Number, required: true },
      weightCharge: { type: Number, required: true },
      totalCharge: { type: Number, required: true },
    },

    paymentMethod: { type: String, enum: ['cash', 'upi', 'wallet'], default: 'cash' },
    paymentStatus: { type: String, enum: ['pending', 'paid', 'failed'], default: 'pending' },

    status: {
      type: String,
      enum: [
        'requested',
        'accepted',
        'picked_up',
        'in_transit',
        'delivered',
        'cancelled',
      ],
      default: 'requested',
    },

    receiverOtp: { type: String },
    cancelReason: { type: String, default: '' },
    cancelledBy: { type: String, enum: ['customer', 'driver', 'admin', ''], default: '' },

    requestedAt: { type: Date, default: Date.now },
    pickedUpAt: { type: Date },
    deliveredAt: { type: Date },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Parcel', parcelSchema);
