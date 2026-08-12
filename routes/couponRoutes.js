const express = require('express');
const router = express.Router();
const { protectCustomer } = require('../middleware/auth');
const { getCoupons, validateCoupon } = require('../controllers/couponController');

// All customer coupon routes require authentication
router.use(protectCustomer);

router.get('/', getCoupons);
router.post('/validate', validateCoupon);

module.exports = router;
