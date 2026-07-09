const express = require('express');
const router = express.Router();
const { protectDriver } = require('../middleware/auth');
const {
  acceptParcel,
  pickupParcel,
  markInTransit,
  deliverParcel,
  getActiveParcel,
  cancelParcel,
} = require('../controllers/driverParcelController');

router.use(protectDriver);

router.get('/active', getActiveParcel);
router.put('/:id/accept', acceptParcel);
router.put('/:id/pickup', pickupParcel);
router.put('/:id/in-transit', markInTransit);
router.put('/:id/deliver', deliverParcel);
router.put('/:id/cancel', cancelParcel);

module.exports = router;
