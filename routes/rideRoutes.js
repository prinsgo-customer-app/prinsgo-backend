const express = require('express');
const router = express.Router();

const {
  estimateFare,
  bookRide,
  getActiveRide,
  getRideById,
  getRideHistory,
  cancelRide,
  rateRide,
} = require('../controllers/rideController');

// Estimate fare
router.post('/estimate', estimateFare);

// Book ride (new route)
router.post('/book', bookRide);

// Backward compatibility (old app)
router.post('/create', bookRide);

// Active ride
router.get('/active', getActiveRide);

// Ride history
router.get('/history/:userId', getRideHistory);

// Single ride
router.get('/:id', getRideById);

// Cancel ride
router.put('/:id/cancel', cancelRide);

// Rate ride
router.post('/:id/rate', rateRide);

module.exports = router;
