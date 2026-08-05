const Ride = require('../models/Ride');
const Parcel = require('../models/Parcel');
const Driver = require('../models/Driver');
const User = require('../models/User');
const { broadcastDashboardStats } = require('../utils/adminSocketService');

// @desc    List all rides with filters, search, and pagination
// @route   GET /api/admin/rides?status=&search=&page=&limit=
// @access  Private (admin)
const listRides = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const search = req.query.search || '';

    const filter = {};
    if (req.query.status) filter.status = req.query.status;

    if (search) {
      const [matchedUsers, matchedDrivers] = await Promise.all([
        User.find({ $or: [{ name: new RegExp(search, 'i') }, { phone: new RegExp(search, 'i') }] }).select('_id'),
        Driver.find({ $or: [{ name: new RegExp(search, 'i') }, { phone: new RegExp(search, 'i') }] }).select('_id'),
      ]);
      const userIds = matchedUsers.map((u) => u._id);
      const driverIds = matchedDrivers.map((d) => d._id);
      filter.$or = [
        { customer: { $in: userIds } },
        { driver: { $in: driverIds } },
      ];
    }

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

// @desc    Create a new ride
// @route   POST /api/admin/rides
// @access  Private (admin)
const createRide = async (req, res, next) => {
  try {
    const { customer, driver, pickup, drop, vehicleType, distanceKm, durationMin, fare, status, paymentMethod } = req.body;

    if (!customer || !pickup || !drop || !vehicleType) {
      return res.status(400).json({ success: false, message: 'Customer, pickup, drop, and vehicleType are required' });
    }

    const ride = await Ride.create({
      customer,
      driver: driver || null,
      pickup,
      drop,
      vehicleType,
      distanceKm: distanceKm || 0,
      durationMin: durationMin || 0,
      fare: fare || { baseFare: 0, distanceFare: 0, timeFare: 0, platformFee: 0, totalFare: 0 },
      status: status || 'requested',
      paymentMethod: paymentMethod || 'cash',
      startOtp: Math.floor(1000 + Math.random() * 9000).toString(),
    });

    // Realtime update trigger
    const io = req.app.get('io');
    if (io) {
      io.emit('ride_created', { rideId: ride._id });
      broadcastDashboardStats(io);
    }

    res.status(201).json({ success: true, message: 'Ride created successfully', ride });
  } catch (error) {
    next(error);
  }
};

// @desc    Update a ride
// @route   PUT /api/admin/rides/:id
// @access  Private (admin)
const updateRide = async (req, res, next) => {
  try {
    const ride = await Ride.findById(req.params.id);
    if (!ride) {
      return res.status(404).json({ success: false, message: 'Ride not found' });
    }

    const fields = [
      'driver',
      'pickup',
      'drop',
      'vehicleType',
      'distanceKm',
      'durationMin',
      'fare',
      'status',
      'paymentMethod',
      'paymentStatus',
    ];

    fields.forEach((field) => {
      if (req.body[field] !== undefined) {
        ride[field] = req.body[field];
      }
    });

    await ride.save();

    // Realtime update trigger
    const io = req.app.get('io');
    if (io) {
      io.emit('ride_updated', { rideId: ride._id, status: ride.status });
      broadcastDashboardStats(io);
    }

    res.status(200).json({ success: true, message: 'Ride updated successfully', ride });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete a ride
// @route   DELETE /api/admin/rides/:id
// @access  Private (admin)
const deleteRide = async (req, res, next) => {
  try {
    const ride = await Ride.findByIdAndDelete(req.params.id);
    if (!ride) {
      return res.status(404).json({ success: false, message: 'Ride not found' });
    }

    // Realtime update trigger
    const io = req.app.get('io');
    if (io) {
      io.emit('ride_deleted', { rideId: req.params.id });
      broadcastDashboardStats(io);
    }

    res.status(200).json({ success: true, message: 'Ride deleted successfully' });
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

    // Realtime update trigger
    const io = req.app.get('io');
    if (io) {
      io.emit('ride_updated', { rideId: ride._id, status: 'cancelled' });
      broadcastDashboardStats(io);
    }

    res.status(200).json({ success: true, message: 'Ride force-cancelled', ride });
  } catch (error) {
    next(error);
  }
};

// @desc    List all parcels with filters, search, and pagination
// @route   GET /api/admin/parcels?status=&search=&page=&limit=
// @access  Private (admin)
const listParcels = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const search = req.query.search || '';

    const filter = {};
    if (req.query.status) filter.status = req.query.status;

    if (search) {
      const [matchedUsers, matchedDrivers] = await Promise.all([
        User.find({ $or: [{ name: new RegExp(search, 'i') }, { phone: new RegExp(search, 'i') }] }).select('_id'),
        Driver.find({ $or: [{ name: new RegExp(search, 'i') }, { phone: new RegExp(search, 'i') }] }).select('_id'),
      ]);
      const userIds = matchedUsers.map((u) => u._id);
      const driverIds = matchedDrivers.map((d) => d._id);
      filter.$or = [
        { customer: { $in: userIds } },
        { driver: { $in: driverIds } },
      ];
    }

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

// @desc    Create a new parcel
// @route   POST /api/admin/parcels
// @access  Private (admin)
const createParcel = async (req, res, next) => {
  try {
    const { customer, driver, pickup, drop, weightKg, type, charges, status, paymentMethod } = req.body;

    if (!customer || !pickup || !drop || !type) {
      return res.status(400).json({ success: false, message: 'Customer, pickup, drop, and type are required' });
    }

    const parcel = await Parcel.create({
      customer,
      driver: driver || null,
      pickup,
      drop,
      weightKg: weightKg || 1,
      type,
      charges: charges || { baseCharge: 0, distanceCharge: 0, totalCharge: 0 },
      status: status || 'requested',
      paymentMethod: paymentMethod || 'cash',
    });

    // Realtime update trigger
    const io = req.app.get('io');
    if (io) {
      io.emit('parcel_created', { parcelId: parcel._id });
      broadcastDashboardStats(io);
    }

    res.status(201).json({ success: true, message: 'Parcel created successfully', parcel });
  } catch (error) {
    next(error);
  }
};

// @desc    Update a parcel
// @route   PUT /api/admin/parcels/:id
// @access  Private (admin)
const updateParcel = async (req, res, next) => {
  try {
    const parcel = await Parcel.findById(req.params.id);
    if (!parcel) {
      return res.status(404).json({ success: false, message: 'Parcel not found' });
    }

    const fields = [
      'driver',
      'pickup',
      'drop',
      'weightKg',
      'type',
      'charges',
      'status',
      'paymentMethod',
      'paymentStatus',
    ];

    fields.forEach((field) => {
      if (req.body[field] !== undefined) {
        parcel[field] = req.body[field];
      }
    });

    await parcel.save();

    // Realtime update trigger
    const io = req.app.get('io');
    if (io) {
      io.emit('parcel_updated', { parcelId: parcel._id, status: parcel.status });
      broadcastDashboardStats(io);
    }

    res.status(200).json({ success: true, message: 'Parcel updated successfully', parcel });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete a parcel
// @route   DELETE /api/admin/parcels/:id
// @access  Private (admin)
const deleteParcel = async (req, res, next) => {
  try {
    const parcel = await Parcel.findByIdAndDelete(req.params.id);
    if (!parcel) {
      return res.status(404).json({ success: false, message: 'Parcel not found' });
    }

    // Realtime update trigger
    const io = req.app.get('io');
    if (io) {
      io.emit('parcel_deleted', { parcelId: req.params.id });
      broadcastDashboardStats(io);
    }

    res.status(200).json({ success: true, message: 'Parcel deleted successfully' });
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

    // Realtime update trigger
    const io = req.app.get('io');
    if (io) {
      io.emit('parcel_updated', { parcelId: parcel._id, status: 'cancelled' });
      broadcastDashboardStats(io);
    }

    res.status(200).json({ success: true, message: 'Parcel force-cancelled', parcel });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  listRides,
  getRideById,
  createRide,
  updateRide,
  deleteRide,
  forceCancelRide,
  listParcels,
  getParcelById,
  createParcel,
  updateParcel,
  deleteParcel,
  forceCancelParcel,
};