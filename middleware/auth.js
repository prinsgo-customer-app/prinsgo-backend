const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Driver = require('../models/Driver');

// ==========================
// Customer Authentication
// ==========================
const protectCustomer = async (req, res, next) => {
  try {
    let token;

    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith('Bearer ')
    ) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized. Token missing.',
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (decoded.role && decoded.role !== 'customer') {
      return res.status(403).json({
        success: false,
        message: 'Access denied.',
      });
    }

    const user = await User.findById(decoded.id || decoded._id).select('-password');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not found.',
      });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired token.',
      error: error.message,
    });
  }
};

// ==========================
// Driver Authentication
// ==========================
const protectDriver = async (req, res, next) => {
  try {
    let token;

    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith('Bearer ')
    ) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized. Token missing.',
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (decoded.role && decoded.role !== 'driver') {
      return res.status(403).json({
        success: false,
        message: 'Access denied.',
      });
    }

    const driver = await Driver.findById(decoded.id || decoded._id);

    if (!driver) {
      return res.status(401).json({
        success: false,
        message: 'Driver not found.',
      });
    }

    req.driver = driver;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired token.',
      error: error.message,
    });
  }
};

// ==========================
// Admin Authentication (Support x-admin-secret header and JWT)
// ==========================
const protectAdmin = async (req, res, next) => {
  try {
    const secret = req.headers['x-admin-secret'];

    // 1. Check for secret key first (backwards compatibility)
    if (secret && secret === process.env.ADMIN_SECRET_KEY) {
      req.admin = { id: 'admin_secret', role: 'admin', name: 'Secret Admin' };
      return next();
    }

    // 2. Otherwise check for Bearer JWT token
    let token;
    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith('Bearer ')
    ) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(403).json({
        success: false,
        message: 'Admin access denied. Secret or token required.',
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Support roles: admin, superadmin, manager
    const allowedRoles = ['admin', 'superadmin', 'manager'];
    if (!decoded.role || !allowedRoles.includes(decoded.role)) {
      return res.status(403).json({
        success: false,
        message: 'Admin access denied. Invalid role.',
      });
    }

    if (decoded.id === 'admin_secret') {
      req.admin = { id: 'admin_secret', role: 'admin', name: 'System Admin' };
      return next();
    }

    const user = await User.findById(decoded.id || decoded._id).select('-password');
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Admin user not found.',
      });
    }

    if (user.isBlocked) {
      return res.status(403).json({
        success: false,
        message: 'Your account has been blocked.',
      });
    }

    // Double check that the database role matches the expected roles
    if (!allowedRoles.includes(user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Admin access denied. User role mismatch.',
      });
    }

    req.admin = user;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired admin token.',
      error: error.message,
    });
  }
};

// ==========================
// Role-Based Restriction Middleware
// ==========================
const restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!req.admin || !roles.includes(req.admin.role)) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to perform this action.',
      });
    }
    next();
  };
};

// Alias
const protect = protectCustomer;

module.exports = {
  protect,
  protectCustomer,
  protectDriver,
  protectAdmin,
  restrictTo,
};