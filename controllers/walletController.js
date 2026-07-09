const WalletTransaction = require('../models/WalletTransaction');

// @desc    Get customer's own wallet transaction history
// @route   GET /api/wallet/transactions
// @access  Private (customer)
const getMyTransactions = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;

    const transactions = await WalletTransaction.find({ ownerType: 'User', owner: req.user._id })
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    const total = await WalletTransaction.countDocuments({ ownerType: 'User', owner: req.user._id });

    res.status(200).json({
      success: true,
      walletBalance: req.user.walletBalance,
      transactions,
      page,
      totalPages: Math.ceil(total / limit),
      total,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { getMyTransactions };
