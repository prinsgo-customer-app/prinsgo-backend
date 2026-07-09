const express = require('express');
const router = express.Router();
const { protectCustomer } = require('../middleware/auth');
const {
  sendOtp,
  verifyOtpAndLogin,
  getMe,
  updateProfile,
  addAddress,
  deleteAddress,
} = require('../controllers/authController');

router.post('/send-otp', sendOtp);
router.post('/verify-otp', verifyOtpAndLogin);

router.get('/me', protectCustomer, getMe);
router.put('/profile', protectCustomer, updateProfile);
router.post('/address', protectCustomer, addAddress);
router.delete('/address/:addressId', protectCustomer, deleteAddress);

module.exports = router;
