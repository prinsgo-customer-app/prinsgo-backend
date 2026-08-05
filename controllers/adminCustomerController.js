const User = require('../models/User');
const Ride = require('../models/Ride');
const Parcel = require('../models/Parcel');
const { broadcastDashboardStats } = require('../utils/adminSocketService');

// @desc    List customers with search + pagination
// @route   GET /api/admin/customers?search=&page=&limit=
// @access  Private (admin)
const listCustomers = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const search = req.query.search || '';

    const filter = search
      ? { $or: [{ name: new RegExp(search, 'i') }, { phone: new RegExp(search, 'i') }] }
      : {};

    const customers = await User.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .select('-__v');

    const total = await User.countDocuments(filter);

    res.status(200).json({ success: true, customers, page, totalPages: Math.ceil(total / limit), total });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single customer with recent ride/parcel activity
// @route   GET /api/admin/customers/:id
// @access  Private (admin)
const getCustomerById = async (req, res, next) => {
  try {
    const customer = await User.findById(req.params.id);
    if (!customer) {
      return res.status(404).json({ success: false, message: 'Customer not found' });
    }

    const [recentRides, recentParcels] = await Promise.all([
      Ride.find({ customer: customer._id }).sort({ createdAt: -1 }).limit(10),
      Parcel.find({ customer: customer._id }).sort({ createdAt: -1 }).limit(10),
    ]);

    res.status(200).json({ success: true, customer, recentRides, recentParcels });
  } catch (error) {
    next(error);
  }
};

// @desc    Create a new customer
// @route   POST /api/admin/customers
// @access  Private (admin)
const createCustomer = async (req, res, next) => {
  try {
    const { name, phone, email, role, walletBalance } = req.body;

    if (!name || !phone) {
      return res.status(400).json({ success: false, message: 'Name and phone are required' });
    }

    if (!/^[6-9]\d{9}$/.test(phone)) {
      return res.status(400).json({ success: false, message: 'Enter a valid 10-digit Indian mobile number' });
    }

    const existingUser = await User.findOne({ phone });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'Customer with this phone number already exists' });
    }

    const customer = await User.create({
      name,
      phone,
      email: email || '',
      role: role || 'customer',
      walletBalance: walletBalance || 0,
      referralCode: `PG${phone.slice(-6)}${Math.floor(Math.random() * 90 + 10)}`,
      isPhoneVerified: true,
    });

    // Realtime update trigger
    const io = req.app.get('io');
    if (io) {
      io.emit('customer_created', { customerId: customer._id, name: customer.name });
      broadcastDashboardStats(io);
    }

    res.status(201).json({ success: true, message: 'Customer created successfully', customer });
  } catch (error) {
    next(error);
  }
};

// @desc    Update a customer
// @route   PUT /api/admin/customers/:id
// @access  Private (admin)
const updateCustomer = async (req, res, next) => {
  try {
    const { name, phone, email, role, walletBalance, isActive } = req.body;
    const customer = await User.findById(req.params.id);

    if (!customer) {
      return res.status(404).json({ success: false, message: 'Customer not found' });
    }

    if (phone && phone !== customer.phone) {
      if (!/^[6-9]\d{9}$/.test(phone)) {
        return res.status(400).json({ success: false, message: 'Enter a valid 10-digit Indian mobile number' });
      }
      const existingUser = await User.findOne({ phone });
      if (existingUser) {
        return res.status(400).json({ success: false, message: 'Phone number already in use' });
      }
      customer.phone = phone;
    }

    if (name !== undefined) customer.name = name;
    if (email !== undefined) customer.email = email;
    if (role !== undefined) customer.role = role;
    if (walletBalance !== undefined) customer.walletBalance = walletBalance;
    if (isActive !== undefined) customer.isActive = isActive;

    await customer.save();

    // Realtime update trigger
    const io = req.app.get('io');
    if (io) {
      io.emit('customer_updated', { customerId: customer._id });
      broadcastDashboardStats(io);
    }

    res.status(200).json({ success: true, message: 'Customer updated successfully', customer });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete a customer
// @route   DELETE /api/admin/customers/:id
// @access  Private (admin)
const deleteCustomer = async (req, res, next) => {
  try {
    const customer = await User.findByIdAndDelete(req.params.id);
    if (!customer) {
      return res.status(404).json({ success: false, message: 'Customer not found' });
    }

    // Realtime update trigger
    const io = req.app.get('io');
    if (io) {
      io.emit('customer_deleted', { customerId: req.params.id });
      broadcastDashboardStats(io);
    }

    res.status(200).json({ success: true, message: 'Customer deleted successfully' });
  } catch (error) {
    next(error);
  }
};

// @desc    Block a customer
// @route   PUT /api/admin/customers/:id/block
// @access  Private (admin)
const blockCustomer = async (req, res, next) => {
  try {
    const customer = await User.findByIdAndUpdate(req.params.id, { isBlocked: true }, { new: true });
    if (!customer) {
      return res.status(404).json({ success: false, message: 'Customer not found' });
    }
    const io = req.app.get('io');
    if (io) {
      broadcastDashboardStats(io);
    }
    res.status(200).json({ success: true, message: 'Customer blocked', customer });
  } catch (error) {
    next(error);
  }
};

// @desc    Unblock a customer
// @route   PUT /api/admin/customers/:id/unblock
// @access  Private (admin)
const unblockCustomer = async (req, res, next) => {
  try {
    const customer = await User.findByIdAndUpdate(req.params.id, { isBlocked: false }, { new: true });
    if (!customer) {
      return res.status(404).json({ success: false, message: 'Customer not found' });
    }
    const io = req.app.get('io');
    if (io) {
      broadcastDashboardStats(io);
    }
    res.status(200).json({ success: true, message: 'Customer unblocked', customer });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  listCustomers,
  getCustomerById,
  createCustomer,
  updateCustomer,
  deleteCustomer,
  blockCustomer,
  unblockCustomer,
};