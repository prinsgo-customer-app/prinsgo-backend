const express = require('express');
const router = express.Router();
const { protectCustomer } = require('../middleware/auth');
const {
  estimateParcelCharge,
  bookParcel,
  getActiveParcels,
  getParcelById,
  getParcelHistory,
  cancelParcel,
} = require('../controllers/parcelController');

router.use(protectCustomer);

router.post('/estimate', estimateParcelCharge);
router.post('/book', bookParcel);
router.get('/active', getActiveParcels);
router.get('/history', getParcelHistory);
router.get('/:id', getParcelById);
router.put('/:id/cancel', cancelParcel);

module.exports = router;
