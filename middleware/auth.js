const jwt = require('jsonwebtoken');
const User = require('../models/User'); // अगर आपके मॉडल का नाम Customer है, तो '../models/Customer' करें

const protect = async (req, res, next) => {
  try {
    let token;

    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith('Bearer')
    ) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized to access this route. Token missing.',
      });
    }

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || 'your_fallback_secret'
    );

    const user = await User.findById(decoded.id || decoded._id).select(
      '-password'
    );

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'The user belonging to this token no longer exists.',
      });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Not authorized. Invalid or expired token.',
      error: error.message,
    });
  }
};

module.exports = { protect };
