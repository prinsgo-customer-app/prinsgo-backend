const Driver = require('../models/Driver');
const Ride = require('../models/Ride');
const Parcel = require('../models/Parcel');
const { haversineDistanceKm } = require('../utils/geoUtils');

const SEARCH_RADIUS_KM = 5;

// @desc    Toggle driver online/offline status
// @route   PUT /api/driver/status
// @access  Private (driver)
const toggleOnlineStatus = async (req, res, next) => {
  try {
    const { isOnline } = req.body;

    if (typeof isOnline !== 'boolean') {
      return res.status(400).json({ success: false, message: 'isOnline must be true or false' });
    }

    const driver = await Driver.findById(req.driver._id);

    if (isOnline && !driver.isApproved) {
      return res.status(403).json({ success: false, message: 'Your documents are not yet approved by admin' });
    }
    if (isOnline && driver.documentStatus !== 'approved') {
      return res.status(403).json({ success: false, message: 'Complete your document verification first' });
    }

    driver.isOnline = isOnline;
    driver.isAvailable = isOnline;
    await driver.save();

    res.status(200).json({ success: true, message: `You are now ${isOnline ? 'online' : 'offline'}`, driver });
  } catch (error) {
    next(error);
  }
};

// @desc    Update driver's live GPS location
// @route   PUT /api/driver/location
// @access  Private (driver)
const updateLocation = async (req, res, next) => {
  try {
    const { lat, lng } = req.body;
    if (lat === undefined || lng === undefined) {
      return res.status(400).json({ success: false, message: 'lat and lng are required' });
    }

    const driver = await Driver.findByIdAndUpdate(
      req.driver._id,
      { currentLocation: { type: 'Point', coordinates: [lng, lat] } },
      { new: true }
    );

    // Broadcast to anyone tracking this driver's active ride/parcel
    const io = req.app.get('io');
    const activeRide = await Ride.findOne({
      driver: driver._id,
      status: { $in: ['accepted', 'driver_arrived', 'started'] },
    });
    if (activeRide && io) {
      io.to(`ride_${activeRide._id}`).emit('driver_location', { lat, lng });
    }
    const activeParcel = await Parcel.findOne({
      driver: driver._id,
      status: { $in: ['accepted', 'picked_up', 'in_transit'] },
    });
    if (activeParcel && io) {
      io.to(`parcel_${activeParcel._id}`).emit('driver_location', { lat, lng });
    }

    res.status(200).json({ success: true, message: 'Location updated' });
  } catch (error) {
    next(error);
  }
};

// @desc    Get nearby pending ride + parcel requests matching driver's vehicle type
// @route   GET /api/driver/nearby-requests
// @access  Private (driver)
const getNearbyRequests = async (req, res, next) => {
  try {
    const driver = req.driver;

    if (!driver.isOnline) {
      return res.status(400).json({ success: false, message: 'Go online to see requests' });
    }

    const [driverLng, driverLat] = driver.currentLocation.coordinates;

    let nearbyRides = [];
    if (driver.vehicleType !== 'parcel_van') {
      const pendingRides = await Ride.find({ status: 'requested', vehicleType: driver.vehicleType }).populate(
        'customer',
        'name phone rating'
      );
      nearbyRides = pendingRides
        .map((ride) => ({
          ...ride.toObject(),
          distanceToPickupKm:
            Math.round(
              haversineDistanceKm(driverLat, driverLng, ride.pickup.lat, ride.pickup.lng) * 10
            ) / 10,
        }))
        .filter((r) => r.distanceToPickupKm <= SEARCH_RADIUS_KM)
        .sort((a, b) => a.distanceToPickupKm - b.distanceToPickupKm);
    }

    let nearbyParcels = [];
    const pendingParcels = await Parcel.find({ status: 'requested' });
    nearbyParcels = pendingParcels
      .map((parcel) => ({
        ...parcel.toObject(),
        distanceToPickupKm:
          Math.round(
            haversineDistanceKm(driverLat, driverLng, parcel.pickup.lat, parcel.pickup.lng) * 10
          ) / 10,
      }))
      .filter((p) => p.distanceToPickupKm <= SEARCH_RADIUS_KM)
      .sort((a, b) => a.distanceToPickupKm - b.distanceToPickupKm);

    res.status(200).json({ success: true, nearbyRides, nearbyParcels });
  } catch (error) {
    next(error);
  }
};

// @desc    Get driver earnings summary (today/week/month)
// @route   GET /api/driver/earnings
// @access  Private (driver)
const getEarnings = async (req, res, next) => {
  try {
    const driverId = req.driver._id;

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const startOfWeek = new Date();
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
    startOfWeek.setHours(0, 0, 0, 0);
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const buildSummary = async (fromDate) => {
      const rides = await Ride.find({ driver: driverId, status: 'completed', completedAt: { $gte: fromDate } });
      const parcels = await Parcel.find({ driver: driverId, status: 'delivered', deliveredAt: { $gte: fromDate } });

      const rideEarnings = rides.reduce((sum, r) => sum + r.fare.totalFare, 0);
      const parcelEarnings = parcels.reduce((sum, p) => sum + p.charges.totalCharge, 0);

      return {
        totalEarnings: rideEarnings + parcelEarnings,
        rideCount: rides.length,
        parcelCount: parcels.length,
      };
    };

    const [today, week, month] = await Promise.all([
      buildSummary(startOfToday),
      buildSummary(startOfWeek),
      buildSummary(startOfMonth),
    ]);

    res.status(200).json({
      success: true,
      walletBalance: req.driver.walletBalance,
      today,
      week,
      month,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { toggleOnlineStatus, updateLocation, getNearbyRequests, getEarnings };
