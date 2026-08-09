const express = require('express');
const router = express.Router();
const { protectCustomer } = require('../middleware/auth');
const { createOrder, verifyPayment } = require('../controllers/paymentController');

router.use(protectCustomer);

router.post('/create-order', createOrder);
router.post('/verify', verifyPayment);

module.exports = router;
