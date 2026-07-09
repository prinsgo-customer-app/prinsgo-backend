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

router.use(protectCustomer);

router.post('/estimate', estimateFare);
router.post('/book', bookRide);
router.get('/active', getActiveRide);
router.get('/history', getRideHistory);
router.get('/:id', getRideById);
router.put('/:id/cancel', cancelRide);
router.post('/:id/rate', rateRide);

module.exports = router;
