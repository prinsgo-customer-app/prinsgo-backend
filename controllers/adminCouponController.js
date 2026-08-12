const Coupon = require('../models/Coupon');

// @desc    Create a new coupon
// @route   POST /api/admin/coupons
// @access  Private (admin)
const createCoupon = async (req, res, next) => {
  try {
    const {
      code,
      description,
      discountType,
      discountValue,
      minOrderAmount,
      maxDiscountAmount,
      expiryDate,
      isActive,
      usageLimit,
      userUsageLimit,
      eligibleService,
    } = req.body;

    if (!code || !discountValue || !expiryDate) {
      return res.status(400).json({
        success: false,
        message: 'code, discountValue, and expiryDate are required',
      });
    }

    const existing = await Coupon.findOne({ code: code.toUpperCase().trim() });
    if (existing) {
      return res.status(400).json({ success: false, message: 'Coupon code already exists' });
    }

    const coupon = await Coupon.create({
      code: code.toUpperCase().trim(),
      description,
      discountType,
      discountValue,
      minOrderAmount,
      maxDiscountAmount,
      expiryDate: new Date(expiryDate),
      isActive: isActive !== undefined ? isActive : true,
      usageLimit,
      userUsageLimit,
      eligibleService,
    });

    res.status(201).json({ success: true, message: 'Coupon created successfully', coupon });
  } catch (error) {
    next(error);
  }
};

// @desc    List all coupons
// @route   GET /api/admin/coupons
// @access  Private (admin)
const listCoupons = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;

    const coupons = await Coupon.find()
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    const total = await Coupon.countDocuments();

    res.status(200).json({
      success: true,
      coupons,
      page,
      totalPages: Math.ceil(total / limit),
      total,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single coupon details
// @route   GET /api/admin/coupons/:id
// @access  Private (admin)
const getCouponById = async (req, res, next) => {
  try {
    const coupon = await Coupon.findById(req.params.id);
    if (!coupon) {
      return res.status(404).json({ success: false, message: 'Coupon not found' });
    }
    res.status(200).json({ success: true, coupon });
  } catch (error) {
    next(error);
  }
};

// @desc    Update an existing coupon
// @route   PUT /api/admin/coupons/:id
// @access  Private (admin)
const updateCoupon = async (req, res, next) => {
  try {
    const updates = { ...req.body };
    if (updates.code) {
      updates.code = updates.code.toUpperCase().trim();
    }
    if (updates.expiryDate) {
      updates.expiryDate = new Date(updates.expiryDate);
    }

    const coupon = await Coupon.findByIdAndUpdate(req.params.id, updates, {
      new: true,
      runValidators: true,
    });

    if (!coupon) {
      return res.status(404).json({ success: false, message: 'Coupon not found' });
    }

    res.status(200).json({ success: true, message: 'Coupon updated successfully', coupon });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete a coupon
// @route   DELETE /api/admin/coupons/:id
// @access  Private (admin)
const deleteCoupon = async (req, res, next) => {
  try {
    const coupon = await Coupon.findByIdAndDelete(req.params.id);
    if (!coupon) {
      return res.status(404).json({ success: false, message: 'Coupon not found' });
    }
    res.status(200).json({ success: true, message: 'Coupon deleted successfully' });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createCoupon,
  listCoupons,
  getCouponById,
  updateCoupon,
  deleteCoupon,
};
