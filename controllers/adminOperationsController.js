const Ride = require('../models/Ride');
const Parcel = require('../models/Parcel');
const Driver = require('../models/Driver');

// @desc    List all rides with filters
// @route   GET /api/admin/rides?status=&page=&limit=
// @access  Private (admin)
const listRides = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const filter = {};
    if (req.query.status) filter.status = req.query.status;

    const rides = await Ride.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('customer', 'name phone')
      .populate('driver', 'name phone vehicleNumber');

    const total = await Ride.countDocuments(filter);

    res.status(200).json({ success: true, rides, page, totalPages: Math.ceil(total / limit), total });
  } catch (error) {
    next(error);
  }
};

// @desc    Get ride details by ID
// @route   GET /api/admin/rides/:id
// @access  Private (admin)
const getRideById = async (req, res, next) => {
  try {
    const ride = await Ride.findById(req.params.id)
      .populate('customer', 'name phone')
      .populate('driver', 'name phone vehicleNumber vehicleType');
    if (!ride) {
      return res.status(404).json({ success: false, message: 'Ride not found' });
    }
    res.status(200).json({ success: true, ride });
  } catch (error) {
    next(error);
  }
};

// @desc    Force-cancel a ride (admin override, e.g. dispute/fraud)
// @route   PUT /api/admin/rides/:id/cancel
// @access  Private (admin)
const forceCancelRide = async (req, res, next) => {
  try {
    const { reason } = req.body;
    const ride = await Ride.findById(req.params.id);
    if (!ride) {
      return res.status(404).json({ success: false, message: 'Ride not found' });
    }
    if (['completed', 'cancelled'].includes(ride.status)) {
      return res.status(400).json({ success: false, message: `Ride already ${ride.status}` });
    }

    ride.status = 'cancelled';
    ride.cancelReason = reason || 'Cancelled by admin';
    ride.cancelledBy = 'admin';
    await ride.save();

    if (ride.driver) {
      await Driver.findByIdAndUpdate(ride.driver, { isAvailable: true });
    }

    res.status(200).json({ success: true, message: 'Ride force-cancelled', ride });
  } catch (error) {
    next(error);
  }
};

// @desc    List all parcels with filters
// @route   GET /api/admin/parcels?status=&page=&limit=
// @access  Private (admin)
const listParcels = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const filter = {};
    if (req.query.status) filter.status = req.query.status;

    const parcels = await Parcel.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('customer', 'name phone')
      .populate('driver', 'name phone vehicleNumber');

    const total = await Parcel.countDocuments(filter);

    res.status(200).json({ success: true, parcels, page, totalPages: Math.ceil(total / limit), total });
  } catch (error) {
    next(error);
  }
};

// @desc    Get parcel details by ID
// @route   GET /api/admin/parcels/:id
// @access  Private (admin)
const getParcelById = async (req, res, next) => {
  try {
    const parcel = await Parcel.findById(req.params.id)
      .populate('customer', 'name phone')
      .populate('driver', 'name phone vehicleNumber vehicleType');
    if (!parcel) {
      return res.status(404).json({ success: false, message: 'Parcel not found' });
    }
    res.status(200).json({ success: true, parcel });
  } catch (error) {
    next(error);
  }
};

// @desc    Force-cancel a parcel (admin override)
// @route   PUT /api/admin/parcels/:id/cancel
// @access  Private (admin)
const forceCancelParcel = async (req, res, next) => {
  try {
    const { reason } = req.body;
    const parcel = await Parcel.findById(req.params.id);
    if (!parcel) {
      return res.status(404).json({ success: false, message: 'Parcel not found' });
    }
    if (['delivered', 'cancelled'].includes(parcel.status)) {
      return res.status(400).json({ success: false, message: `Parcel already ${parcel.status}` });
    }

    parcel.status = 'cancelled';
    parcel.cancelReason = reason || 'Cancelled by admin';
    parcel.cancelledBy = 'admin';
    await parcel.save();

    if (parcel.driver) {
      await Driver.findByIdAndUpdate(parcel.driver, { isAvailable: true });
    }

    res.status(200).json({ success: true, message: 'Parcel force-cancelled', parcel });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  listRides,
  getRideById,
  forceCancelRide,
  listParcels,
  getParcelById,
  forceCancelParcel,
};
