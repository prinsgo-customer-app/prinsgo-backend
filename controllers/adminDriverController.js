const Driver = require('../models/Driver');
const Ride = require('../models/Ride');
const Parcel = require('../models/Parcel');

// @desc    List drivers with search + filters + pagination
// @route   GET /api/admin/drivers?search=&status=&page=&limit=
// @access  Private (admin)
const listDrivers = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const search = req.query.search || '';
    const status = req.query.status; // 'pending' | 'approved' | 'rejected'

    const filter = {};
    if (search) {
      filter.$or = [{ name: new RegExp(search, 'i') }, { phone: new RegExp(search, 'i') }, { vehicleNumber: new RegExp(search, 'i') }];
    }
    if (status) {
      filter.documentStatus = status;
    }

    const drivers = await Driver.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .select('-__v');

    const total = await Driver.countDocuments(filter);

    res.status(200).json({ success: true, drivers, page, totalPages: Math.ceil(total / limit), total });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single driver with recent activity
// @route   GET /api/admin/drivers/:id
// @access  Private (admin)
const getDriverById = async (req, res, next) => {
  try {
    const driver = await Driver.findById(req.params.id);
    if (!driver) {
      return res.status(404).json({ success: false, message: 'Driver not found' });
    }

    const [recentRides, recentParcels] = await Promise.all([
      Ride.find({ driver: driver._id }).sort({ createdAt: -1 }).limit(10),
      Parcel.find({ driver: driver._id }).sort({ createdAt: -1 }).limit(10),
    ]);

    res.status(200).json({ success: true, driver, recentRides, recentParcels });
  } catch (error) {
    next(error);
  }
};

// @desc    Approve driver documents (allows going online)
// @route   PUT /api/admin/drivers/:id/approve
// @access  Private (admin)
const approveDriver = async (req, res, next) => {
  try {
    const driver = await Driver.findByIdAndUpdate(
      req.params.id,
      { documentStatus: 'approved', isApproved: true },
      { new: true }
    );
    if (!driver) {
      return res.status(404).json({ success: false, message: 'Driver not found' });
    }
    res.status(200).json({ success: true, message: 'Driver approved', driver });
  } catch (error) {
    next(error);
  }
};

// @desc    Reject driver documents
// @route   PUT /api/admin/drivers/:id/reject
// @access  Private (admin)
const rejectDriver = async (req, res, next) => {
  try {
    const { reason } = req.body;
    const driver = await Driver.findByIdAndUpdate(
      req.params.id,
      { documentStatus: 'rejected', isApproved: false, isOnline: false },
      { new: true }
    );
    if (!driver) {
      return res.status(404).json({ success: false, message: 'Driver not found' });
    }
    res.status(200).json({ success: true, message: `Driver rejected${reason ? ': ' + reason : ''}`, driver });
  } catch (error) {
    next(error);
  }
};

// @desc    Block a driver
// @route   PUT /api/admin/drivers/:id/block
// @access  Private (admin)
const blockDriver = async (req, res, next) => {
  try {
    const driver = await Driver.findByIdAndUpdate(
      req.params.id,
      { isBlocked: true, isOnline: false },
      { new: true }
    );
    if (!driver) {
      return res.status(404).json({ success: false, message: 'Driver not found' });
    }
    res.status(200).json({ success: true, message: 'Driver blocked', driver });
  } catch (error) {
    next(error);
  }
};

// @desc    Unblock a driver
// @route   PUT /api/admin/drivers/:id/unblock
// @access  Private (admin)
const unblockDriver = async (req, res, next) => {
  try {
    const driver = await Driver.findByIdAndUpdate(req.params.id, { isBlocked: false }, { new: true });
    if (!driver) {
      return res.status(404).json({ success: false, message: 'Driver not found' });
    }
    res.status(200).json({ success: true, message: 'Driver unblocked', driver });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  listDrivers,
  getDriverById,
  approveDriver,
  rejectDriver,
  blockDriver,
  unblockDriver,
};
