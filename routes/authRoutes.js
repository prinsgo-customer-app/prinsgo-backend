const express = require('express');
const router = express.Router();
const { protectCustomer } = require('../middleware/auth');
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

module.exports = router;
