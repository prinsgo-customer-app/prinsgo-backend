const Ride = require('../models/Ride');
const Parcel = require('../models/Parcel');
const WorkerBooking = require('../models/WorkerBooking');

// @desc    Get unified bookings (rides + parcels + workers) for a customer with status filters and pagination
// @route   GET /api/bookings
// @access  Private (customer)
const getMyBookings = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const statusFilter = req.query.status ? req.query.status.toLowerCase().trim() : 'all'; // 'all', 'ongoing', 'completed', 'cancelled'

    // Status map logic
    // Rides ongoing: requested, accepted, driver_arrived, started
    // Parcels ongoing: requested, accepted, picked_up, in_transit
    // Workers ongoing: pending, accepted, on_the_way, arrived, in_progress
    let rideStatusQuery = {};
    let parcelStatusQuery = {};
    let workerStatusQuery = {};

    if (statusFilter === 'ongoing') {
      rideStatusQuery.status = { $in: ['requested', 'accepted', 'driver_arrived', 'started'] };
      parcelStatusQuery.status = { $in: ['requested', 'accepted', 'picked_up', 'in_transit'] };
      workerStatusQuery.status = { $in: ['pending', 'accepted', 'on_the_way', 'arrived', 'in_progress'] };
    } else if (statusFilter === 'completed') {
      rideStatusQuery.status = 'completed';
      parcelStatusQuery.status = 'delivered';
      workerStatusQuery.status = 'completed';
    } else if (statusFilter === 'cancelled') {
      rideStatusQuery.status = 'cancelled';
      parcelStatusQuery.status = 'cancelled';
      workerStatusQuery.status = { $in: ['cancelled', 'rejected'] };
    }

    const customerId = req.user._id;

    // Fetch rides, parcels and worker bookings
    const rides = await Ride.find({ customer: customerId, ...rideStatusQuery })
      .populate('driver', 'name phone vehicleNumber vehicleType rating');

    const parcels = await Parcel.find({ customer: customerId, ...parcelStatusQuery })
      .populate('driver', 'name phone vehicleNumber vehicleType rating');

    const workerBookings = await WorkerBooking.find({ customer: customerId, ...workerStatusQuery })
      .populate('worker', 'name phone profileImage rating')
      .populate('category', 'name icon');

    // Unify all arrays
    const unifiedBookings = [];

    rides.forEach((ride) => {
      let mappedStatus = 'ongoing';
      if (ride.status === 'completed') mappedStatus = 'completed';
      if (ride.status === 'cancelled') mappedStatus = 'cancelled';

      unifiedBookings.push({
        id: ride._id,
        bookingType: 'ride',
        pickup: ride.pickup,
        drop: ride.drop,
        status: mappedStatus,
        subStatus: ride.status,
        amount: ride.finalAmount !== null ? ride.finalAmount : ride.fare?.totalFare,
        originalFare: ride.fare?.totalFare,
        discount: ride.discount || 0,
        paymentMethod: ride.paymentMethod,
        paymentStatus: ride.paymentStatus,
        createdAt: ride.createdAt,
        driver: ride.driver,
        details: {
          vehicleType: ride.vehicleType,
          distanceKm: ride.distanceKm,
          durationMin: ride.durationMin,
        },
      });
    });

    parcels.forEach((parcel) => {
      let mappedStatus = 'ongoing';
      if (parcel.status === 'delivered') mappedStatus = 'completed';
      if (parcel.status === 'cancelled') mappedStatus = 'cancelled';

      unifiedBookings.push({
        id: parcel._id,
        bookingType: 'parcel',
        pickup: parcel.pickup,
        drop: parcel.drop,
        status: mappedStatus,
        subStatus: parcel.status,
        amount: parcel.finalAmount !== null ? parcel.finalAmount : parcel.charges?.totalCharge,
        originalFare: parcel.charges?.totalCharge,
        discount: parcel.discount || 0,
        paymentMethod: parcel.paymentMethod,
        paymentStatus: parcel.paymentStatus,
        createdAt: parcel.createdAt,
        driver: parcel.driver,
        details: {
          parcelType: parcel.parcelType,
          weightCategory: parcel.weightCategory,
          distanceKm: parcel.distanceKm,
          durationMin: parcel.durationMin,
        },
      });
    });

    workerBookings.forEach((booking) => {
      let mappedStatus = 'ongoing';
      if (booking.status === 'completed') mappedStatus = 'completed';
      if (booking.status === 'cancelled' || booking.status === 'rejected') mappedStatus = 'cancelled';

      unifiedBookings.push({
        id: booking._id,
        bookingType: 'worker',
        pickup: booking.location,
        drop: booking.location,
        status: mappedStatus,
        subStatus: booking.status,
        amount: booking.finalAmount !== null ? booking.finalAmount : booking.pricing?.totalAmount,
        originalFare: booking.pricing?.totalAmount,
        discount: booking.discount || 0,
        paymentMethod: booking.paymentMethod,
        paymentStatus: booking.paymentStatus,
        createdAt: booking.createdAt,
        worker: booking.worker,
        details: {
          categoryName: booking.category?.name,
          date: booking.date,
          time: booking.time,
          taskDescription: booking.taskDescription,
        },
      });
    });

    // Sort unified list by createdAt descending
    unifiedBookings.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    // Paginate in-memory
    const total = unifiedBookings.length;
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedBookings = unifiedBookings.slice(startIndex, endIndex);

    res.status(200).json({
      success: true,
      bookings: paginatedBookings,
      total,
      page,
      totalPages: Math.ceil(total / limit),
      limit,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getMyBookings,
};
