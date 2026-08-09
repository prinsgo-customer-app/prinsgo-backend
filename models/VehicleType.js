const mongoose = require('mongoose');

const vehicleTypeSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true }, // e.g. 'bike', 'auto', 'car_mini'
    name: { type: String, required: true }, // e.g. 'Bike', 'Auto', 'Mini Cab'
    type: { type: String, enum: ['ride', 'parcel'], required: true },
    baseFare: { type: Number, required: true },
    perKm: { type: Number, required: true },
    perMin: { type: Number, required: true },
    minFare: { type: Number, required: true },
    capacity: { type: Number, default: 1 },
    isActive: { type: Boolean, default: true },
    ordering: { type: Number, default: 0 },
    icon: { type: String, default: '' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('VehicleType', vehicleTypeSchema);
