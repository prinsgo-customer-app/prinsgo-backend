const Driver = require('../models/Driver');
const Ride = require('../models/Ride');
const Parcel = require('../models/Parcel');
const { broadcastDashboardStats } = require('../utils/adminSocketService');

const VALID_VEHICLES = ['bike', 'auto', 'car_mini', 'car_sedan', 'parcel_van'];

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

// @desc    Create a new driver
// @route   POST /api/admin/drivers
// @access  Private (admin)
const createDriver = async (req, res, next) => {
  try {
    const { name, phone, email, vehicleType, vehicleNumber, rating, walletBalance } = req.body;

    if (!name || !phone || !vehicleType || !vehicleNumber) {
      return res.status(400).json({ success: false, message: 'Name, phone, vehicleType, and vehicleNumber are required' });
    }

    if (!/^[6-9]\d{9}$/.test(phone)) {
      return res.status(400).json({ success: false, message: 'Enter a valid 10-digit Indian mobile number' });
    }

    if (!VALID_VEHICLES.includes(vehicleType)) {
      return res.status(400).json({ success: false, message: 'Invalid vehicle type' });
    }

    const existingDriver = await Driver.findOne({ phone });
    if (existingDriver) {
      return res.status(400).json({ success: false, message: 'Driver with this phone number already exists' });
    }

    const driver = await Driver.create({
      name,
      phone,
      email: email || '',
      vehicleType,
      vehicleNumber: vehicleNumber.toUpperCase().trim(),
      rating: rating || 5.0,
      walletBalance: walletBalance || 0,
      isPhoneVerified: true,
      documentStatus: 'approved',
      isApproved: true,
    });

    // Realtime update trigger
    const io = req.app.get('io');
    if (io) {
      io.emit('driver_created', { driverId: driver._id, name: driver.name });
      broadcastDashboardStats(io);
    }

    res.status(201).json({ success: true, message: 'Driver created successfully', driver });
  } catch (error) {
    next(error);
  }
};

// @desc    Update a driver
// @route   PUT /api/admin/drivers/:id
// @access  Private (admin)
const updateDriver = async (req, res, next) => {
  try {
    const { name, phone, email, vehicleType, vehicleNumber, rating, walletBalance, documentStatus, isApproved, isBlocked } = req.body;
    const driver = await Driver.findById(req.params.id);

    if (!driver) {
      return res.status(404).json({ success: false, message: 'Driver not found' });
    }

    if (phone && phone !== driver.phone) {
      if (!/^[6-9]\d{9}$/.test(phone)) {
        return res.status(400).json({ success: false, message: 'Enter a valid 10-digit Indian mobile number' });
      }
      const existingDriver = await Driver.findOne({ phone });
      if (existingDriver) {
        return res.status(400).json({ success: false, message: 'Phone number already in use' });
      }
      driver.phone = phone;
    }

    if (vehicleType && !VALID_VEHICLES.includes(vehicleType)) {
      return res.status(400).json({ success: false, message: 'Invalid vehicle type' });
    }

    if (name !== undefined) driver.name = name;
    if (email !== undefined) driver.email = email;
    if (vehicleType !== undefined) driver.vehicleType = vehicleType;
    if (vehicleNumber !== undefined) driver.vehicleNumber = vehicleNumber.toUpperCase().trim();
    if (rating !== undefined) driver.rating = rating;
    if (walletBalance !== undefined) driver.walletBalance = walletBalance;
    if (documentStatus !== undefined) driver.documentStatus = documentStatus;
    if (isApproved !== undefined) driver.isApproved = isApproved;
    if (isBlocked !== undefined) {
      driver.isBlocked = isBlocked;
      if (isBlocked) driver.isOnline = false;
    }

    await driver.save();

    // Realtime update trigger
    const io = req.app.get('io');
    if (io) {
      io.emit('driver_updated', { driverId: driver._id });
      broadcastDashboardStats(io);
    }

    res.status(200).json({ success: true, message: 'Driver updated successfully', driver });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete a driver
// @route   DELETE /api/admin/drivers/:id
// @access  Private (admin)
const deleteDriver = async (req, res, next) => {
  try {
    const driver = await Driver.findByIdAndDelete(req.params.id);
    if (!driver) {
      return res.status(404).json({ success: false, message: 'Driver not found' });
    }

    // Realtime update trigger
    const io = req.app.get('io');
    if (io) {
      io.emit('driver_deleted', { driverId: req.params.id });
      broadcastDashboardStats(io);
    }

    res.status(200).json({ success: true, message: 'Driver deleted successfully' });
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
    const io = req.app.get('io');
    if (io) {
      broadcastDashboardStats(io);
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
    const io = req.app.get('io');
    if (io) {
      broadcastDashboardStats(io);
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
    const io = req.app.get('io');
    if (io) {
      broadcastDashboardStats(io);
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
    const io = req.app.get('io');
    if (io) {
      broadcastDashboardStats(io);
    }
    res.status(200).json({ success: true, message: 'Driver unblocked', driver });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  listDrivers,
  getDriverById,
  createDriver,
  updateDriver,
  deleteDriver,
  approveDriver,
  rejectDriver,
  blockDriver,
  unblockDriver,
};