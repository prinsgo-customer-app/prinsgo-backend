const express = require('express');
const router = express.Router();

const { protect } = require('../middleware/auth');

const {
  estimateFare,
  bookRide,
  getActiveRide,
  getRideById,
  getRideHistory,
  cancelRide,
  rateRide,
} = require('../controllers/rideController');

// Fare Estimate
router.post('/estimate', estimateFare);

// Book Ride
router.post('/book', protect, bookRide);

// Active Ride
router.get('/active', protect, getActiveRide);

// Ride History
router.get('/history', protect, getRideHistory);

// Ride Details
router.get('/:id', protect, getRideById);

// Cancel Ride
router.put('/:id/cancel', protect, cancelRide);

// Rate Ride
router.post('/:id/rate', protect, rateRide);

module.exports = router;
