const User = require('../models/User');
const Driver = require('../models/Driver');
const Ride = require('../models/Ride');
const Parcel = require('../models/Parcel');

// @desc    Get dashboard summary stats
// @route   GET /api/admin/dashboard
// @access  Private (admin)
const getDashboard = async (req, res, next) => {
  try {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const [
      totalCustomers,
      totalDrivers,
      pendingDriverApprovals,
      onlineDrivers,
      ridesToday,
      parcelsToday,
      activeRides,
      activeParcels,
    ] = await Promise.all([
      User.countDocuments(),
      Driver.countDocuments(),
      Driver.countDocuments({ documentStatus: 'pending' }),
      Driver.countDocuments({ isOnline: true }),
      Ride.find({ status: 'completed', completedAt: { $gte: startOfToday } }),
      Parcel.find({ status: 'delivered', deliveredAt: { $gte: startOfToday } }),
      Ride.countDocuments({ status: { $in: ['requested', 'accepted', 'driver_arrived', 'started'] } }),
      Parcel.countDocuments({ status: { $in: ['requested', 'accepted', 'picked_up', 'in_transit'] } }),
    ]);

    const rideRevenueToday = ridesToday.reduce((sum, r) => sum + r.fare.totalFare, 0);
    const parcelRevenueToday = parcelsToday.reduce((sum, p) => sum + p.charges.totalCharge, 0);

    res.status(200).json({
      success: true,
      stats: {
        totalCustomers,
        totalDrivers,
        pendingDriverApprovals,
        onlineDrivers,
        activeRides,
        activeParcels,
        ridesCompletedToday: ridesToday.length,
        parcelsDeliveredToday: parcelsToday.length,
        revenueToday: rideRevenueToday + parcelRevenueToday,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get earnings/usage report for a date range (daily/weekly/monthly)
// @route   GET /api/admin/reports/earnings?range=daily|weekly|monthly
// @access  Private (admin)
const getEarningsReport = async (req, res, next) => {
  try {
    const range = req.query.range || 'daily';
    const from = new Date();

    if (range === 'daily') from.setDate(from.getDate() - 1);
    else if (range === 'weekly') from.setDate(from.getDate() - 7);
    else if (range === 'monthly') from.setMonth(from.getMonth() - 1);
    else return res.status(400).json({ success: false, message: 'range must be daily, weekly, or monthly' });

    const rides = await Ride.find({ status: 'completed', completedAt: { $gte: from } });
    const parcels = await Parcel.find({ status: 'delivered', deliveredAt: { $gte: from } });

    const rideRevenue = rides.reduce((sum, r) => sum + r.fare.totalFare, 0);
    const parcelRevenue = parcels.reduce((sum, p) => sum + p.charges.totalCharge, 0);
    const platformFees = rides.reduce((sum, r) => sum + r.fare.platformFee, 0);

    res.status(200).json({
      success: true,
      range,
      from,
      to: new Date(),
      rideCount: rides.length,
      parcelCount: parcels.length,
      rideRevenue,
      parcelRevenue,
      totalRevenue: rideRevenue + parcelRevenue,
      platformFees,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get user growth / driver report
// @route   GET /api/admin/reports/users?range=daily|weekly|monthly
// @access  Private (admin)
const getUsersReport = async (req, res, next) => {
  try {
    const range = req.query.range || 'weekly';
    const from = new Date();

    if (range === 'daily') from.setDate(from.getDate() - 1);
    else if (range === 'weekly') from.setDate(from.getDate() - 7);
    else if (range === 'monthly') from.setMonth(from.getMonth() - 1);
    else return res.status(400).json({ success: false, message: 'range must be daily, weekly, or monthly' });

    const [newCustomers, newDrivers] = await Promise.all([
      User.countDocuments({ createdAt: { $gte: from } }),
      Driver.countDocuments({ createdAt: { $gte: from } }),
    ]);

    res.status(200).json({ success: true, range, newCustomers, newDrivers });
  } catch (error) {
    next(error);
  }
};

// @desc    Get referral program report - who referred how many users
// @route   GET /api/admin/reports/referrals
// @access  Private (admin)
const getReferralReport = async (req, res, next) => {
  try {
    const referrers = await User.aggregate([
      { $match: { referredBy: { $ne: null } } },
      { $group: { _id: '$referredBy', referredCount: { $sum: 1 } } },
      { $sort: { referredCount: -1 } },
      { $limit: 50 },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'referrer',
        },
      },
      { $unwind: '$referrer' },
      {
        $project: {
          referrerId: '$_id',
          referrerName: '$referrer.name',
          referrerPhone: '$referrer.phone',
          referredCount: 1,
        },
      },
    ]);

    const totalReferred = await User.countDocuments({ referredBy: { $ne: null } });

    res.status(200).json({ success: true, totalReferred, topReferrers: referrers });
  } catch (error) {
    next(error);
  }
};

module.exports = { getDashboard, getEarningsReport, getUsersReport, getReferralReport };
