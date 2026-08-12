const express = require('express');
const router = express.Router();
const { protectCustomer } = require('../middleware/auth');
const { getMyBookings } = require('../controllers/bookingController');

// All unified bookings require customer authentication
router.use(protectCustomer);

router.get('/', getMyBookings);

module.exports = router;
