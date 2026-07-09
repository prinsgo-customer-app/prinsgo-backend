const Ride = require('../models/Ride');
const Driver = require('../models/Driver');
const { calculateRideFare } = require('../utils/fareCalculator');
const { getDistanceAndDuration } = require('../utils/mapsService');
const { generateOtpCode } = require('../utils/otpService');

// @desc    Get fare estimate for all vehicle types before booking
// @route   POST /api/rides/estimate
// @access  Private (customer)
const estimateFare = async (req, res, next) => {
  try {
    const { pickupLat, pickupLng, dropLat, dropLng } = req.body;

    if ([pickupLat, pickupLng, dropLat, dropLng].some((v) => v === undefined)) {
      return res.status(400).json({ success: false, message: 'Pickup and drop coordinates are required' });
    }

    const { distanceKm, durationMin } = await getDistanceAndDuration(
      pickupLat,
      pickupLng,
      dropLat,
      dropLng
    );

    const vehicleTypes = ['bike', 'auto', 'car_mini', 'car_sedan'];
    const estimates = vehicleTypes.map((vehicleType) => ({
      vehicleType,
      ...calculateRideFare({ vehicleType, distanceKm, durationMin }),
    }));

    res.status(200).json({ success: true, distanceKm, durationMin, estimates });
  } catch (error) {
    next(error);
  }
};

// @desc    Book a new ride
// @route   POST /api/rides/book
// @access  Private (customer)
const bookRide = async (req, res, next) => {
  try {
    const { pickup, drop, vehicleType, paymentMethod } = req.body;

    if (!pickup?.address || !drop?.address || !vehicleType) {
      return res.status(400).json({ success: false, message: 'Pickup, drop, and vehicle type are required' });
    }

    const validVehicles = ['bike', 'auto', 'car_mini', 'car_sedan'];
    if (!validVehicles.includes(vehicleType)) {
      return res.status(400).json({ success: false, message: 'Invalid vehicle type' });
    }

    // Prevent duplicate active rides
    const activeRide = await Ride.findOne({
      customer: req.user._id,
      status: { $in: ['requested', 'accepted', 'driver_arrived', 'started'] },
    });
    if (activeRide) {
      return res.status(400).json({ success: false, message: 'You already have an active ride' });
    }

    const { distanceKm, durationMin } = await getDistanceAndDuration(
      pickup.lat,
      pickup.lng,
      drop.lat,
      drop.lng
    );

    const fare = calculateRideFare({ vehicleType, distanceKm, durationMin });
    const startOtp = generateOtpCode().slice(0, 4);

    const ride = await Ride.create({
      customer: req.user._id,
      pickup,
      drop,
      vehicleType,
      distanceKm,
      durationMin,
      fare,
      paymentMethod: paymentMethod || 'cash',
      startOtp,
    });

    // Notify all online drivers of matching vehicle type about the new request
    const io = req.app.get('io');
    if (io) {
      io.emit('new_ride_request', { rideId: ride._id, vehicleType, pickup });
    }

    res.status(201).json({ success: true, message: 'Ride requested successfully', ride });
  } catch (error) {
    next(error);
  }
};

// @desc    Get current active ride for customer
// @route   GET /api/rides/active
// @access  Private (customer)
const getActiveRide = async (req, res, next) => {
  try {
    const ride = await Ride.findOne({
      customer: req.user._id,
      status: { $in: ['requested', 'accepted', 'driver_arrived', 'started'] },
    }).populate('driver', 'name phone vehicleNumber vehicleType rating currentLocation');

    res.status(200).json({ success: true, ride: ride || null });
  } catch (error) {
    next(error);
  }
};

// @desc    Get ride details by ID
// @route   GET /api/rides/:id
// @access  Private (customer)
const getRideById = async (req, res, next) => {
  try {
    const ride = await Ride.findOne({ _id: req.params.id, customer: req.user._id }).populate(
      'driver',
      'name phone vehicleNumber vehicleType rating'
    );

    if (!ride) {
      return res.status(404).json({ success: false, message: 'Ride not found' });
    }

    res.status(200).json({ success: true, ride });
  } catch (error) {
    next(error);
  }
};

// @desc    Get ride history for customer
// @route   GET /api/rides/history
// @access  Private (customer)
const getRideHistory = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;

    const rides = await Ride.find({
      customer: req.user._id,
      status: { $in: ['completed', 'cancelled'] },
    })
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('driver', 'name vehicleNumber vehicleType');

    const total = await Ride.countDocuments({
      customer: req.user._id,
      status: { $in: ['completed', 'cancelled'] },
    });

    res.status(200).json({ success: true, rides, page, totalPages: Math.ceil(total / limit), total });
  } catch (error) {
    next(error);
  }
};

// @desc    Cancel a ride
// @route   PUT /api/rides/:id/cancel
// @access  Private (customer)
const cancelRide = async (req, res, next) => {
  try {
    const { reason } = req.body;
    const ride = await Ride.findOne({ _id: req.params.id, customer: req.user._id });

    if (!ride) {
      return res.status(404).json({ success: false, message: 'Ride not found' });
    }

    if (['completed', 'cancelled'].includes(ride.status)) {
      return res.status(400).json({ success: false, message: `Ride already ${ride.status}` });
    }

    if (ride.status === 'started') {
      return res.status(400).json({ success: false, message: 'Cannot cancel a ride that has already started' });
    }

    ride.status = 'cancelled';
    ride.cancelReason = reason || 'Cancelled by customer';
    ride.cancelledBy = 'customer';
    await ride.save();

    if (ride.driver) {
      await Driver.findByIdAndUpdate(ride.driver, { isAvailable: true });
    }

    res.status(200).json({ success: true, message: 'Ride cancelled', ride });
  } catch (error) {
    next(error);
  }
};

// @desc    Rate a completed ride
// @route   POST /api/rides/:id/rate
// @access  Private (customer)
const rateRide = async (req, res, next) => {
  try {
    const { rating, review } = req.body;

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ success: false, message: 'Rating must be between 1 and 5' });
    }

    const ride = await Ride.findOne({ _id: req.params.id, customer: req.user._id });
    if (!ride) {
      return res.status(404).json({ success: false, message: 'Ride not found' });
    }
    if (ride.status !== 'completed') {
      return res.status(400).json({ success: false, message: 'Only completed rides can be rated' });
    }
    if (ride.customerRating) {
      return res.status(400).json({ success: false, message: 'Ride already rated' });
    }

    ride.customerRating = rating;
    ride.customerReview = review || '';
    await ride.save();

    // Update driver's average rating
    const driver = await Driver.findById(ride.driver);
    if (driver) {
      const newTotalRides = driver.totalRides + 1;
      driver.rating = (driver.rating * driver.totalRides + rating) / newTotalRides;
      await driver.save();
    }

    res.status(200).json({ success: true, message: 'Thank you for your feedback', ride });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  estimateFare,
  bookRide,
  getActiveRide,
  getRideById,
  getRideHistory,
  cancelRide,
  rateRide,
};
