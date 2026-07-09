const express = require('express');
const router = express.Router();
const { protectDriver } = require('../middleware/auth');
const {
  acceptRide,
  markArrived,
  startRide,
  completeRide,
  getActiveRide,
  getRideHistory,
  cancelRide,
} = require('../controllers/driverRideController');

router.use(protectDriver);

router.get('/active', getActiveRide);
router.get('/history', getRideHistory);
router.put('/:id/accept', acceptRide);
router.put('/:id/arrived', markArrived);
router.put('/:id/start', startRide);
router.put('/:id/complete', completeRide);
router.put('/:id/cancel', cancelRide);

module.exports = router;
