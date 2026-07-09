const User = require('../models/User');
const Driver = require('../models/Driver');
const WalletTransaction = require('../models/WalletTransaction');

// @desc    Manually credit or debit a customer/driver wallet
// @route   POST /api/admin/wallet/adjust
// @access  Private (admin)
const adjustWallet = async (req, res, next) => {
  try {
    const { ownerType, ownerId, type, amount, reason } = req.body;

    if (!['User', 'Driver'].includes(ownerType)) {
      return res.status(400).json({ success: false, message: 'ownerType must be User or Driver' });
    }
    if (!['credit', 'debit'].includes(type)) {
      return res.status(400).json({ success: false, message: 'type must be credit or debit' });
    }
    if (!amount || amount <= 0) {
      return res.status(400).json({ success: false, message: 'amount must be a positive number' });
    }

    const Model = ownerType === 'User' ? User : Driver;
    const owner = await Model.findById(ownerId);
    if (!owner) {
      return res.status(404).json({ success: false, message: `${ownerType} not found` });
    }

    if (type === 'debit' && owner.walletBalance < amount) {
      return res.status(400).json({ success: false, message: 'Insufficient wallet balance for debit' });
    }

    owner.walletBalance += type === 'credit' ? amount : -amount;
    await owner.save();

    const transaction = await WalletTransaction.create({
      ownerType,
      owner: owner._id,
      type,
      amount,
      reason: reason || 'admin_adjustment',
      balanceAfter: owner.walletBalance,
    });

    res.status(200).json({
      success: true,
      message: `Wallet ${type === 'credit' ? 'credited' : 'debited'} successfully`,
      newBalance: owner.walletBalance,
      transaction,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    List wallet transactions with filters
// @route   GET /api/admin/wallet/transactions?ownerType=&ownerId=&page=&limit=
// @access  Private (admin)
const listWalletTransactions = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 30;
    const filter = {};
    if (req.query.ownerType) filter.ownerType = req.query.ownerType;
    if (req.query.ownerId) filter.owner = req.query.ownerId;

    const transactions = await WalletTransaction.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    const total = await WalletTransaction.countDocuments(filter);

    res.status(200).json({ success: true, transactions, page, totalPages: Math.ceil(total / limit), total });
  } catch (error) {
    next(error);
  }
};

module.exports = { adjustWallet, listWalletTransactions };
