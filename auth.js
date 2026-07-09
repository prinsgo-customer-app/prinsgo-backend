const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Driver = require('../models/Driver');

// Protect customer routes
const protectCustomer = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'Not authorized, token missing' });
    }
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (decoded.role !== 'customer') {
      return res.status(403).json({ success: false, message: 'Access denied for this role' });
    }

    const user = await User.findById(decoded.id).select('-__v');
    if (!user) {
      return res.status(401).json({ success: false, message: 'User not found' });
    }
    if (user.isBlocked) {
      return res.status(403).json({ success: false, message: 'Your account has been blocked' });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ success: false, message: 'Invalid or expired token' });
  }
};

// Protect driver routes
const protectDriver = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'Not authorized, token missing' });
    }
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (decoded.role !== 'driver') {
      return res.status(403).json({ success: false, message: 'Access denied for this role' });
    }

    const driver = await Driver.findById(decoded.id).select('-__v');
    if (!driver) {
      return res.status(401).json({ success: false, message: 'Driver not found' });
    }
    if (driver.isBlocked) {
      return res.status(403).json({ success: false, message: 'Your account has been blocked' });
    }

    req.driver = driver;
    next();
  } catch (error) {
    return res.status(401).json({ success: false, message: 'Invalid or expired token' });
  }
};

// Admin route protection
const protectAdmin = (req, res, next) => {
  const secret = req.headers['x-admin-secret'];
  if (!secret || secret !== process.env.ADMIN_SECRET_KEY) {
    return res.status(403).json({ success: false, message: 'Admin access denied' });
  }
  next();
};

module.exports = { protectCustomer, protectDriver, protectAdmin };
