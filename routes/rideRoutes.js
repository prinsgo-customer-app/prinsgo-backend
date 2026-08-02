const express = require('express');
const router = express.Router();

const { protectCustomer } = require('../middleware/auth');

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
router.post('/book', protectCustomer, bookRide);

// Active Ride
router.get('/active', protectCustomer, getActiveRide);

// Ride History
router.get('/history', protectCustomer, getRideHistory);

// Ride Details
router.get('/:id', protectCustomer, getRideById);

// Cancel Ride
router.put('/:id/cancel', protectCustomer, cancelRide);

// Rate Ride
router.post('/:id/rate', protectCustomer, rateRide);

module.exports = router;
