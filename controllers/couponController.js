const Coupon = require('../models/Coupon');

// @desc    Get active and eligible coupons for customers
// @route   GET /api/coupons
// @access  Private (customer)
const getCoupons = async (req, res, next) => {
  try {
    const { serviceType } = req.query;

    const query = {
      isActive: true,
      expiryDate: { $gt: new Date() },
    };

    if (serviceType) {
      query.eligibleService = { $in: [serviceType, 'all'] };
    }

    const coupons = await Coupon.find(query).select('-userUsage');

    // Filter out coupons where global limit or user limit is already exceeded
    const eligibleCoupons = coupons.filter((coupon) => {
      // 1. Check global limit
      if (coupon.usageLimit > 0 && coupon.usedCount >= coupon.usageLimit) {
        return false;
      }

      // 2. Check user personal limit
      const userRecord = coupon.userUsage?.find(
        (u) => u.userId.toString() === req.user._id.toString()
      );
      if (userRecord && userRecord.usedCount >= coupon.userUsageLimit) {
        return false;
      }

      return true;
    });

    res.status(200).json({
      success: true,
      coupons: eligibleCoupons,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Validate a coupon code and calculate discount
// @route   POST /api/coupons/validate
// @access  Private (customer)
const validateCoupon = async (req, res, next) => {
  try {
    const { code, amount, serviceType } = req.body;

    if (!code) {
      return res.status(400).json({ success: false, message: 'Coupon code is required' });
    }
    if (amount === undefined || amount < 0) {
      return res.status(400).json({ success: false, message: 'Valid amount is required' });
    }
    if (!serviceType || !['ride', 'parcel'].includes(serviceType)) {
      return res.status(400).json({ success: false, message: 'Valid serviceType (ride/parcel) is required' });
    }

    const coupon = await Coupon.findOne({ code: code.toUpperCase().trim() });

    if (!coupon) {
      return res.status(404).json({ success: false, message: 'Invalid coupon code' });
    }

    if (!coupon.isActive) {
      return res.status(400).json({ success: false, message: 'Coupon is inactive' });
    }

    if (new Date(coupon.expiryDate) <= new Date()) {
      return res.status(400).json({ success: false, message: 'Coupon has expired' });
    }

    if (coupon.eligibleService !== 'all' && coupon.eligibleService !== serviceType) {
      return res.status(400).json({
        success: false,
        message: `This coupon is only valid for ${coupon.eligibleService}s`,
      });
    }

    if (amount < coupon.minOrderAmount) {
      return res.status(400).json({
        success: false,
        message: `Minimum order value of ₹${coupon.minOrderAmount} is required to use this coupon`,
      });
    }

    // Check global usage limit
    if (coupon.usageLimit > 0 && coupon.usedCount >= coupon.usageLimit) {
      return res.status(400).json({ success: false, message: 'Coupon usage limit has been reached' });
    }

    // Check user personal limit
    const userRecord = coupon.userUsage?.find(
      (u) => u.userId.toString() === req.user._id.toString()
    );
    if (userRecord && userRecord.usedCount >= coupon.userUsageLimit) {
      return res.status(400).json({
        success: false,
        message: `You have reached the maximum usage limit of ${coupon.userUsageLimit} times for this coupon`,
      });
    }

    // Calculate discount
    let discount = 0;
    if (coupon.discountType === 'percentage') {
      discount = (amount * coupon.discountValue) / 100;
      if (coupon.maxDiscountAmount > 0) {
        discount = Math.min(discount, coupon.maxDiscountAmount);
      }
    } else if (coupon.discountType === 'fixed') {
      discount = Math.min(amount, coupon.discountValue);
    }

    // Ensure discount doesn't exceed amount
    discount = Number(discount.toFixed(2));
    const finalAmount = Number((amount - discount).toFixed(2));

    res.status(200).json({
      success: true,
      message: 'Coupon validated successfully',
      coupon: {
        code: coupon.code,
        description: coupon.description,
        discountType: coupon.discountType,
        discountValue: coupon.discountValue,
      },
      discount,
      finalAmount,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getCoupons,
  validateCoupon,
};
