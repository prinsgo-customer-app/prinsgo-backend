const express = require('express');
const router = express.Router();
const { protectCustomer } = require('../middleware/auth');
const { getPublicToggles, getPublicSettings } = require('../controllers/publicController');
const {
  sendOtp,
  verifyOtpAndLogin,
  getMe,
  updateProfile,
  getAddresses,
  addAddress,
  updateAddress,
  deleteAddress,
} = require('../controllers/authController');

router.post('/send-otp', sendOtp);
router.post('/verify-otp', verifyOtpAndLogin);

router.get('/me', protectCustomer, getMe);
router.put('/profile', protectCustomer, updateProfile);
router.get('/addresses', protectCustomer, getAddresses);
router.post('/address', protectCustomer, addAddress);
router.put('/address/:addressId', protectCustomer, updateAddress);
router.delete('/address/:addressId', protectCustomer, deleteAddress);

// Missing Auth Routes
router.get('/toggles', getPublicToggles);
router.get('/settings', getPublicSettings);

module.exports = router;
