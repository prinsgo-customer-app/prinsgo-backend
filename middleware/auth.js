const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Driver = require('../models/Driver');

<<<<<<< HEAD
// ==========================
// Customer Authentication
// ==========================
>>>>>>> ffbb129 (Fix auth middleware and ride routes)
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

<<<<<<< HEAD
// ==========================
// Driver Authentication
// ==========================
=======
// ===============================
// Driver Authentication
// ===============================
>>>>>>> ffbb129 (Fix auth middleware and ride routes)
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

<<<<<<< HEAD
// ==========================
// Admin Authentication
// ==========================
=======
// ===============================
// Admin Authentication
// ===============================
>>>>>>> ffbb129 (Fix auth middleware and ride routes)
const protectAdmin = (req, res, next) => {
  const secret = req.headers['x-admin-secret'];

  if (!secret || secret !== process.env.ADMIN_SECRET_KEY) {
    return res.status(403).json({
      success: false,
      message: 'Admin access denied.',
    });
  }

  next();
};

// Alias
const protect = protectCustomer;

module.exports = {
  protect,
  protectCustomer,
  protectDriver,
  protectAdmin,
};
