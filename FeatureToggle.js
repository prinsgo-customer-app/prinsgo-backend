const mongoose = require('mongoose');

const featureToggleSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true, trim: true }, // e.g. 'ride_booking', 'parcel_booking', 'wallet_payment'
    label: { type: String, required: true },
    description: { type: String, default: '' },
    isEnabled: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('FeatureToggle', featureToggleSchema);
