const Ride = require('../models/Ride');
const Driver = require('../models/Driver');
const User = require('../models/User');
const WalletTransaction = require('../models/WalletTransaction');

// @desc    Accept a pending ride request
// @route   PUT /api/driver/rides/:id/accept
// @access  Private (driver)
const acceptRide = async (req, res, next) => {
  try {
    const driver = req.driver;

    if (!driver.isOnline || !driver.isAvailable) {
      return res.status(400).json({ success: false, message: 'You must be online and available to accept rides' });
    }

    const existingActive = await Ride.findOne({
      driver: driver._id,
      status: { $in: ['accepted', 'driver_arrived', 'started'] },
    });
    if (existingActive) {
      return res.status(400).json({ success: false, message: 'You already have an active ride' });
    }

    const ride = await Ride.findOne({ _id: req.params.id, status: 'requested' });
    if (!ride) {
      return res.status(404).json({ success: false, message: 'Ride request no longer available' });
    }

    ride.driver = driver._id;
    ride.status = 'accepted';
    ride.acceptedAt = new Date();
    await ride.save();

    driver.isAvailable = false;
    await driver.save();

    const io = req.app.get('io');
    if (io) {
      io.to(`ride_${ride._id}`).emit('ride_status_update', { status: 'accepted', driverId: driver._id });
    }

    res.status(200).json({ success: true, message: 'Ride accepted', ride });
  } catch (error) {
    next(error);
  }
};

// @desc    Mark driver as arrived at pickup location
// @route   PUT /api/driver/rides/:id/arrived
// @access  Private (driver)
const markArrived = async (req, res, next) => {
  try {
    const ride = await Ride.findOne({ _id: req.params.id, driver: req.driver._id, status: 'accepted' });
    if (!ride) {
      return res.status(404).json({ success: false, message: 'Ride not found or not in accepted state' });
    }

    ride.status = 'driver_arrived';
    await ride.save();

    const io = req.app.get('io');
    if (io) io.to(`ride_${ride._id}`).emit('ride_status_update', { status: 'driver_arrived' });

    res.status(200).json({ success: true, message: 'Marked as arrived', ride });
  } catch (error) {
    next(error);
  }
};

// @desc    Start the ride after verifying customer's start OTP
// @route   PUT /api/driver/rides/:id/start
// @access  Private (driver)
const startRide = async (req, res, next) => {
  try {
    const { otp } = req.body;
    if (!otp) {
      return res.status(400).json({ success: false, message: 'OTP is required to start the ride' });
    }

    const ride = await Ride.findOne({
      _id: req.params.id,
      driver: req.driver._id,
      status: 'driver_arrived',
    });
    if (!ride) {
      return res.status(404).json({ success: false, message: 'Ride not found or driver has not arrived yet' });
    }

    if (ride.startOtp !== otp) {
      return res.status(400).json({ success: false, message: 'Incorrect OTP' });
    }

    ride.status = 'started';
    ride.startedAt = new Date();
    await ride.save();

    const io = req.app.get('io');
    if (io) io.to(`ride_${ride._id}`).emit('ride_status_update', { status: 'started' });

    res.status(200).json({ success: true, message: 'Ride started', ride });
  } catch (error) {
    next(error);
  }
};

// @desc    Complete the ride and settle payment
// @route   PUT /api/driver/rides/:id/complete
// @access  Private (driver)
const completeRide = async (req, res, next) => {
  try {
    const ride = await Ride.findOne({ _id: req.params.id, driver: req.driver._id, status: 'started' });
    if (!ride) {
      return res.status(404).json({ success: false, message: 'Ride not found or not in progress' });
    }

    ride.status = 'completed';
    ride.completedAt = new Date();

    const driver = await Driver.findById(req.driver._id);

    if (ride.paymentMethod === 'wallet') {
      const customer = await User.findById(ride.customer);
      if (customer.walletBalance < ride.fare.totalFare) {
        return res.status(400).json({ success: false, message: 'Customer has insufficient wallet balance' });
      }
      customer.walletBalance -= ride.fare.totalFare;
      await customer.save();
      await WalletTransaction.create({
        ownerType: 'User',
        owner: customer._id,
        type: 'debit',
        amount: ride.fare.totalFare,
        reason: 'ride_payment',
        referenceId: ride._id,
        balanceAfter: customer.walletBalance,
      });

      driver.walletBalance += ride.fare.totalFare;
      await WalletTransaction.create({
        ownerType: 'Driver',
        owner: driver._id,
        type: 'credit',
        amount: ride.fare.totalFare,
        reason: 'ride_payment',
        referenceId: ride._id,
        balanceAfter: driver.walletBalance,
      });
    }

    ride.paymentStatus = ride.paymentMethod === 'cash' ? 'pending' : 'paid';
    await ride.save();

    driver.isAvailable = true;
    driver.totalRides += 1;
    driver.earningsToday += ride.fare.totalFare;
    await driver.save();

    const io = req.app.get('io');
    if (io) io.to(`ride_${ride._id}`).emit('ride_status_update', { status: 'completed' });

    res.status(200).json({ success: true, message: 'Ride completed', ride });
  } catch (error) {
    next(error);
  }
};

// @desc    Get driver's currently active ride
// @route   GET /api/driver/rides/active
// @access  Private (driver)
const getActiveRide = async (req, res, next) => {
  try {
    const ride = await Ride.findOne({
      driver: req.driver._id,
      status: { $in: ['accepted', 'driver_arrived', 'started'] },
    }).populate('customer', 'name phone rating');

    res.status(200).json({ success: true, ride: ride || null });
  } catch (error) {
    next(error);
  }
};

// @desc    Get driver's ride history
// @route   GET /api/driver/rides/history
// @access  Private (driver)
const getRideHistory = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;

    const rides = await Ride.find({
      driver: req.driver._id,
      status: { $in: ['completed', 'cancelled'] },
    })
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('customer', 'name phone');

    const total = await Ride.countDocuments({
      driver: req.driver._id,
      status: { $in: ['completed', 'cancelled'] },
    });

    res.status(200).json({ success: true, rides, page, totalPages: Math.ceil(total / limit), total });
  } catch (error) {
    next(error);
  }
};

// @desc    Driver cancels an accepted ride
// @route   PUT /api/driver/rides/:id/cancel
// @access  Private (driver)
const cancelRide = async (req, res, next) => {
  try {
    const { reason } = req.body;
    const ride = await Ride.findOne({
      _id: req.params.id,
      driver: req.driver._id,
      status: { $in: ['accepted', 'driver_arrived'] },
    });
    if (!ride) {
      return res.status(404).json({ success: false, message: 'Ride not found or cannot be cancelled at this stage' });
    }

    ride.status = 'cancelled';
    ride.cancelReason = reason || 'Cancelled by driver';
    ride.cancelledBy = 'driver';
    ride.driver = null;
    await ride.save();

    await Driver.findByIdAndUpdate(req.driver._id, { isAvailable: true });

    const io = req.app.get('io');
    if (io) io.to(`ride_${ride._id}`).emit('ride_status_update', { status: 'cancelled', cancelledBy: 'driver' });

    res.status(200).json({ success: true, message: 'Ride cancelled', ride });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  acceptRide,
  markArrived,
  startRide,
  completeRide,
  getActiveRide,
  getRideHistory,
  cancelRide,
};
