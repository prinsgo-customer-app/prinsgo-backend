const User = require('../models/User');
const generateToken = require('../utils/generateToken');
const { createOtp, verifyOtp, sendOtpSms } = require('../utils/otpService');

// @desc    Send OTP to phone for login/register
// @route   POST /api/auth/send-otp
// @access  Public
const sendOtp = async (req, res, next) => {
  try {
    const { phone } = req.body;

    if (!phone || !/^[6-9]\d{9}$/.test(phone)) {
      return res.status(400).json({ success: false, message: 'Enter a valid 10-digit mobile number' });
    }

    const code = await createOtp(phone, 'login');
    const sent = await sendOtpSms(phone, code);

    if (!sent) {
      return res.status(500).json({ success: false, message: 'Failed to send OTP, try again' });
    }

    res.status(200).json({ success: true, message: 'OTP sent successfully' });
  } catch (error) {
    next(error);
  }
};

// @desc    Verify OTP and login/register customer
// @route   POST /api/auth/verify-otp
// @access  Public
const verifyOtpAndLogin = async (req, res, next) => {
  try {
    const { phone, code, name } = req.body;

    if (!phone || !code) {
      return res.status(400).json({ success: false, message: 'Phone and OTP code are required' });
    }

    const result = await verifyOtp(phone, code, 'login');
    if (!result.valid) {
      return res.status(400).json({ success: false, message: result.message });
    }

    let user = await User.findOne({ phone });
    let isNewUser = false;

    if (!user) {
      if (!name) {
        return res.status(400).json({
          success: false,
          message: 'Name is required for new account registration',
          isNewUser: true,
        });
      }
      user = await User.create({
        phone,
        name,
        isPhoneVerified: true,
        referralCode: `PG${phone.slice(-6)}${Math.floor(Math.random() * 90 + 10)}`,
      });
      isNewUser = true;
    } else {
      if (user.isBlocked) {
        return res.status(403).json({ success: false, message: 'Your account has been blocked' });
      }
      user.isPhoneVerified = true;
      await user.save();
    }

    const token = generateToken(user._id, 'customer');

    res.status(200).json({
      success: true,
      message: isNewUser ? 'Account created successfully' : 'Login successful',
      token,
      isNewUser,
      user: {
        id: user._id,
        name: user.name,
        phone: user.phone,
        email: user.email,
        profileImage: user.profileImage,
        walletBalance: user.walletBalance,
        referralCode: user.referralCode,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get logged-in customer profile
// @route   GET /api/auth/me
// @access  Private (customer)
const getMe = async (req, res, next) => {
  try {
    res.status(200).json({ success: true, user: req.user });
  } catch (error) {
    next(error);
  }
};

// @desc    Update customer profile
// @route   PUT /api/auth/profile
// @access  Private (customer)
const updateProfile = async (req, res, next) => {
  try {
    const { name, email, fcmToken } = req.body;

    if (email && !/^\S+@\S+\.\S+$/.test(email)) {
      return res.status(400).json({ success: false, message: 'Enter a valid email address' });
    }

    const updates = {};
    if (name) updates.name = name;
    if (email) updates.email = email;
    if (fcmToken) updates.fcmToken = fcmToken;

    const user = await User.findByIdAndUpdate(req.user._id, updates, {
      new: true,
      runValidators: true,
    });

    res.status(200).json({ success: true, message: 'Profile updated', user });
  } catch (error) {
    next(error);
  }
};

// @desc    Add a saved address (home/work/other)
// @route   POST /api/auth/address
// @access  Private (customer)
const addAddress = async (req, res, next) => {
  try {
    const { label, address, lat, lng } = req.body;

    if (!address || lat === undefined || lng === undefined) {
      return res.status(400).json({ success: false, message: 'Address, lat, and lng are required' });
    }

    const user = await User.findById(req.user._id);
    user.savedAddresses.push({ label: label || 'other', address, lat, lng });
    await user.save();

    res.status(201).json({ success: true, message: 'Address added', savedAddresses: user.savedAddresses });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete a saved address
// @route   DELETE /api/auth/address/:addressId
// @access  Private (customer)
const deleteAddress = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    user.savedAddresses = user.savedAddresses.filter(
      (a) => a._id.toString() !== req.params.addressId
    );
    await user.save();

    res.status(200).json({ success: true, message: 'Address removed', savedAddresses: user.savedAddresses });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  sendOtp,
  verifyOtpAndLogin,
  getMe,
  updateProfile,
  addAddress,
  deleteAddress,
};
