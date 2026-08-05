const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { createOtp, checkOtp, consumeOtp, sendOtpSms } = require('../utils/otpService');

// @desc    Admin login with either the admin secret OR phone + OTP for database admin users
// @route   POST /api/admin/auth/login
// @access  Public
const adminLogin = async (req, res, next) => {
  try {
    const { secret, phone, code } = req.body;

    // 1. Admin Secret Login (Fast and robust for system admins)
    if (secret) {
      if (secret !== process.env.ADMIN_SECRET_KEY) {
        return res.status(401).json({
          success: false,
          message: 'Invalid admin secret key.',
        });
      }

      // Generate token for system admin
      const token = jwt.sign(
        { id: 'admin_secret', role: 'admin' },
        process.env.JWT_SECRET,
        { expiresIn: '30d' }
      );

      return res.status(200).json({
        success: true,
        message: 'Admin login successful using secret key.',
        token,
        admin: {
          id: 'admin_secret',
          name: 'System Admin',
          role: 'admin',
        },
      });
    }

    // 2. Phone + OTP Login for Database Admin Users
    if (phone && code) {
      const result = await checkOtp(phone, code, 'login');
      if (!result.valid) {
        return res.status(400).json({ success: false, message: result.message });
      }

      const user = await User.findOne({ phone });
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found. Admin accounts must be registered by superadmin first.',
        });
      }

      const allowedRoles = ['admin', 'superadmin', 'manager'];
      if (!allowedRoles.includes(user.role)) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. You do not have admin permissions.',
        });
      }

      if (user.isBlocked) {
        return res.status(403).json({
          success: false,
          message: 'Your admin account has been blocked.',
        });
      }

      await consumeOtp(result.record);

      const token = jwt.sign(
        { id: user._id, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: '30d' }
      );

      return res.status(200).json({
        success: true,
        message: 'Admin login successful.',
        token,
        admin: {
          id: user._id,
          name: user.name,
          phone: user.phone,
          email: user.email,
          role: user.role,
        },
      });
    }

    return res.status(400).json({
      success: false,
      message: 'Provide either admin secret or phone + OTP code to log in.',
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get currently logged in admin profile
// @route   GET /api/admin/auth/me
// @access  Private (admin)
const getAdminMe = async (req, res, next) => {
  try {
    res.status(200).json({
      success: true,
      admin: req.admin,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  adminLogin,
  getAdminMe,
};