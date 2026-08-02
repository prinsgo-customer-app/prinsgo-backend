const jwt = require('jsonwebtoken');
const User = require('../models/User');

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

// Alias
const protect = protectCustomer;

module.exports = {
  protect,
  protectCustomer,
};
