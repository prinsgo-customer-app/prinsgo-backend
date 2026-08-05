const User = require('../models/User');
const Driver = require('../models/Driver');
const Ride = require('../models/Ride');
const Parcel = require('../models/Parcel');

/**
 * Fetches the current live statistics and broadcasts them to all connected clients.
 * @param {object} io - Socket.io Server instance
 */
const broadcastDashboardStats = async (io) => {
  try {
    if (!io) return;

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

    const stats = {
      totalCustomers,
      totalDrivers,
      pendingDriverApprovals,
      onlineDrivers,
      activeRides,
      activeParcels,
      ridesCompletedToday: ridesToday.length,
      parcelsDeliveredToday: parcelsToday.length,
      revenueToday: rideRevenueToday + parcelRevenueToday,
      timestamp: new Date(),
    };

    io.emit('dashboard_stats_update', { success: true, stats });
  } catch (error) {
    console.error('Error broadcasting dashboard stats:', error);
  }
};

module.exports = {
  broadcastDashboardStats,
};