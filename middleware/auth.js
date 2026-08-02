const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Driver = require('../models/Driver');

// ==============================
// Customer Authentication
// ==============================
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

    const user = await User.findById(decoded.id).select('-password');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not found.',
      });
    }

    if (user.isBlocked) {
      return res.status(403).json({
        success: false,
        message: 'Your account has been blocked.',
      });
    }

    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired token.',
    });
  }
};

// ==============================
// Driver Authentication
// ==============================
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
        message: 'Driver token missing.',
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const driver = await Driver.findById(decoded.id);

    if (!driver) {
      return res.status(401).json({
        success: false,
        message: 'Driver not found.',
      });
    }

    if (driver.isBlocked) {
      return res.status(403).json({
        success: false,
        message: 'Driver account is blocked.',
      });
    }

    req.driver = driver;
    next();
  } catch (err) {
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired driver token.',
    });
  }
};

// ==============================
// Admin Authentication
// ==============================
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

// Old code compatibility
const protect = protectCustomer;

module.exports = {
  protect,
  protectCustomer,
  protectDriver,
  protectAdmin,
};
