const express = require('express');
const router = express.Router();
const { protectDriver } = require('../middleware/auth');
const { sendOtp, verifyOtpAndLogin, getMe, updateDocuments } = require('../controllers/driverAuthController');

router.post('/send-otp', sendOtp);
router.post('/verify-otp', verifyOtpAndLogin);

router.get('/me', protectDriver, getMe);
router.put('/documents', protectDriver, updateDocuments);

module.exports = router;
