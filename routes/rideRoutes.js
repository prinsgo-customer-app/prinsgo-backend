const express = require('express');
const router = express.Router();

const {
  estimateFare,
  bookRide,
  getActiveRide,
  getRideById,
  getRideHistory,
  cancelRide,
  rateRide
} = require('../controllers/rideController');


// ❌ अभी के लिए हटाया गया
// const { protectCustomer } = require('../middleware/auth');
// router.use(protectCustomer);


// Estimate fare
router.post('/estimate', estimateFare);


// Create booking
router.post('/create', bookRide);


// Active ride
router.get('/active', getActiveRide);


// Ride history
router.get('/history/:userId', getRideHistory);


// Get single ride
router.get('/:id', getRideById);


// Cancel ride
router.put('/:id/cancel', cancelRide);


// Rating
router.post('/:id/rate', rateRide);


module.exports = router;
