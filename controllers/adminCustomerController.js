const User = require('../models/User');
const Ride = require('../models/Ride');
const Parcel = require('../models/Parcel');

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

// @desc    Block a customer
// @route   PUT /api/admin/customers/:id/block
// @access  Private (admin)
const blockCustomer = async (req, res, next) => {
  try {
    const customer = await User.findByIdAndUpdate(req.params.id, { isBlocked: true }, { new: true });
    if (!customer) {
      return res.status(404).json({ success: false, message: 'Customer not found' });
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
    res.status(200).json({ success: true, message: 'Customer unblocked', customer });
  } catch (error) {
    next(error);
  }
};

module.exports = { listCustomers, getCustomerById, blockCustomer, unblockCustomer };
