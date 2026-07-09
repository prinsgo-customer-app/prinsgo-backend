const Driver = require('../models/Driver');
const generateToken = require('../utils/generateToken');
const { createOtp, verifyOtp, sendOtpSms } = require('../utils/otpService');

const VALID_VEHICLES = ['bike', 'auto', 'car_mini', 'car_sedan', 'parcel_van'];

// @desc    Send OTP to driver's phone
// @route   POST /api/driver/auth/send-otp
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

// @desc    Verify OTP, login existing driver or register new one
// @route   POST /api/driver/auth/verify-otp
// @access  Public
const verifyOtpAndLogin = async (req, res, next) => {
  try {
    const { phone, code, name, vehicleType, vehicleNumber } = req.body;

    if (!phone || !code) {
      return res.status(400).json({ success: false, message: 'Phone and OTP code are required' });
    }

    const result = await verifyOtp(phone, code, 'login');
    if (!result.valid) {
      return res.status(400).json({ success: false, message: result.message });
    }

    let driver = await Driver.findOne({ phone });
    let isNewDriver = false;

    if (!driver) {
      if (!name || !vehicleType || !vehicleNumber) {
        return res.status(400).json({
          success: false,
          message: 'Name, vehicle type, and vehicle number are required for registration',
          isNewDriver: true,
        });
      }
      if (!VALID_VEHICLES.includes(vehicleType)) {
        return res.status(400).json({ success: false, message: 'Invalid vehicle type' });
      }

      driver = await Driver.create({
        phone,
        name,
        vehicleType,
        vehicleNumber,
        isPhoneVerified: true,
      });
      isNewDriver = true;
    } else {
      if (driver.isBlocked) {
        return res.status(403).json({ success: false, message: 'Your account has been blocked' });
      }
      driver.isPhoneVerified = true;
      await driver.save();
    }

    const token = generateToken(driver._id, 'driver');

    res.status(200).json({
      success: true,
      message: isNewDriver ? 'Registration successful, documents pending approval' : 'Login successful',
      token,
      isNewDriver,
      driver: {
        id: driver._id,
        name: driver.name,
        phone: driver.phone,
        vehicleType: driver.vehicleType,
        vehicleNumber: driver.vehicleNumber,
        documentStatus: driver.documentStatus,
        isApproved: driver.isApproved,
        rating: driver.rating,
        walletBalance: driver.walletBalance,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get logged-in driver profile
// @route   GET /api/driver/auth/me
// @access  Private (driver)
const getMe = async (req, res, next) => {
  try {
    res.status(200).json({ success: true, driver: req.driver });
  } catch (error) {
    next(error);
  }
};

// @desc    Submit/update KYC document URLs (uploaded separately via Cloudinary on the app)
// @route   PUT /api/driver/auth/documents
// @access  Private (driver)
const updateDocuments = async (req, res, next) => {
  try {
    const { license, rc, insurance, aadhar, pan } = req.body;

    const driver = await Driver.findById(req.driver._id);
    if (license) driver.documents.license = license;
    if (rc) driver.documents.rc = rc;
    if (insurance) driver.documents.insurance = insurance;
    if (aadhar) driver.documents.aadhar = aadhar;
    if (pan) driver.documents.pan = pan;

    // Reset to pending so admin re-reviews after any document change
    driver.documentStatus = 'pending';
    await driver.save();

    res.status(200).json({ success: true, message: 'Documents submitted for review', driver });
  } catch (error) {
    next(error);
  }
};

module.exports = { sendOtp, verifyOtpAndLogin, getMe, updateDocuments };
