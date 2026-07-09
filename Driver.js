const mongoose = require('mongoose');

const driverSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    phone: {
      type: String,
      required: true,
      unique: true,
      match: [/^[6-9]\d{9}$/, 'Enter a valid 10-digit Indian mobile number'],
    },
    email: { type: String, lowercase: true, trim: true },
    isPhoneVerified: { type: Boolean, default: false },
    profileImage: { type: String, default: '' },

    vehicleType: {
      type: String,
      enum: ['bike', 'auto', 'car_mini', 'car_sedan', 'parcel_van'],
      required: true,
    },
    vehicleNumber: { type: String, required: true, uppercase: true, trim: true },

    documents: {
      license: { type: String, default: '' },
      rc: { type: String, default: '' },
      insurance: { type: String, default: '' },
      aadhar: { type: String, default: '' },
      pan: { type: String, default: '' },
    },
    documentStatus: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
    },

    isOnline: { type: Boolean, default: false },
    isAvailable: { type: Boolean, default: true },
    currentLocation: {
      type: { type: String, enum: ['Point'], default: 'Point' },
      coordinates: { type: [Number], default: [0, 0] }, // [lng, lat]
    },

    rating: { type: Number, default: 5.0 },
    totalRides: { type: Number, default: 0 },
    totalParcels: { type: Number, default: 0 },

    walletBalance: { type: Number, default: 0 },
    earningsToday: { type: Number, default: 0 },

    isBlocked: { type: Boolean, default: false },
    isApproved: { type: Boolean, default: false },
  },
  { timestamps: true }
);

driverSchema.index({ currentLocation: '2dsphere' });

module.exports = mongoose.model('Driver', driverSchema);
