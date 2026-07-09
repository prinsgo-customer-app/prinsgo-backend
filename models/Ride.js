const mongoose = require('mongoose');

const locationSchema = new mongoose.Schema(
  {
    address: { type: String, required: true },
    lat: { type: Number, required: true },
    lng: { type: Number, required: true },
  },
  { _id: false }
);

const rideSchema = new mongoose.Schema(
  {
    customer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    driver: { type: mongoose.Schema.Types.ObjectId, ref: 'Driver', default: null },

    pickup: { type: locationSchema, required: true },
    drop: { type: locationSchema, required: true },

    vehicleType: {
      type: String,
      enum: ['bike', 'auto', 'car_mini', 'car_sedan'],
      required: true,
    },

    distanceKm: { type: Number, required: true },
    durationMin: { type: Number, required: true },

    fare: {
      baseFare: { type: Number, required: true },
      distanceFare: { type: Number, required: true },
      timeFare: { type: Number, required: true },
      surgeMultiplier: { type: Number, default: 1 },
      platformFee: { type: Number, default: 0 },
      totalFare: { type: Number, required: true },
    },

    paymentMethod: { type: String, enum: ['cash', 'upi', 'wallet'], default: 'cash' },
    paymentStatus: { type: String, enum: ['pending', 'paid', 'failed'], default: 'pending' },

    status: {
      type: String,
      enum: [
        'requested',
        'accepted',
        'driver_arrived',
        'started',
        'completed',
        'cancelled',
      ],
      default: 'requested',
    },

    startOtp: { type: String },
    cancelReason: { type: String, default: '' },
    cancelledBy: { type: String, enum: ['customer', 'driver', 'admin', ''], default: '' },

    requestedAt: { type: Date, default: Date.now },
    acceptedAt: { type: Date },
    startedAt: { type: Date },
    completedAt: { type: Date },

    customerRating: { type: Number, min: 1, max: 5 },
    customerReview: { type: String, default: '' },
    driverRating: { type: Number, min: 1, max: 5 },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Ride', rideSchema);
