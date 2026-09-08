const express = require('express');
const router = express.Router();
const { protectCustomer } = require('../middleware/auth');
const { checkServiceToggle } = require('../middleware/serviceToggle');
const {
  getCategories,
  getWorkers,
  getWorkerById,
  createWorkerBooking,
  getWorkerBookingById,
  reviewWorkerBooking,
} = require('../controllers/workerController');

// All worker routes require the workers_service to be active
router.use(checkServiceToggle('workers_service'));

// Public-like endpoints for customer (still needs auth to book)
router.get('/categories', getCategories);
router.get('/', getWorkers);
router.get('/:id', getWorkerById);

router.use(protectCustomer);
router.post('/bookings', createWorkerBooking);
router.get('/bookings/:id', getWorkerBookingById);
router.put('/bookings/:id/review', reviewWorkerBooking);

module.exports = router;
