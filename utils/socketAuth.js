const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Driver = require('../models/Driver');

const socketAuthMiddleware = async (socket, next) => {
  try {
    const token = socket.handshake.auth.token || socket.handshake.headers.token;
    if (!token) {
      return next(new Error('Authentication error: Token missing'));
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (decoded.role === 'customer') {
      const user = await User.findById(decoded.id || decoded._id).select('-password');
      if (!user) return next(new Error('Authentication error: User not found'));
      socket.user = user;
      socket.role = 'customer';
    } else if (decoded.role === 'driver') {
      const driver = await Driver.findById(decoded.id || decoded._id);
      if (!driver) return next(new Error('Authentication error: Driver not found'));
      socket.user = driver;
      socket.role = 'driver';
    } else if (decoded.role === 'admin' || decoded.role === 'superadmin' || decoded.role === 'manager') {
      // Just pass through for admins, they might just listen
      socket.user = { _id: decoded.id || decoded._id, role: decoded.role };
      socket.role = 'admin';
    } else {
       return next(new Error('Authentication error: Invalid role'));
    }

    next();
  } catch (error) {
    next(new Error(`Authentication error: ${error.message}`));
  }
};

module.exports = socketAuthMiddleware;
