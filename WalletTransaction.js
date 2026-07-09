const mongoose = require('mongoose');

const walletTransactionSchema = new mongoose.Schema(
  {
    ownerType: { type: String, enum: ['User', 'Driver'], required: true },
    owner: { type: mongoose.Schema.Types.ObjectId, required: true, refPath: 'ownerType' },

    type: { type: String, enum: ['credit', 'debit'], required: true },
    amount: { type: Number, required: true },
    reason: {
      type: String,
      enum: ['ride_payment', 'parcel_payment', 'refund', 'referral_bonus', 'topup', 'withdrawal', 'admin_adjustment'],
      required: true,
    },
    referenceId: { type: mongoose.Schema.Types.ObjectId, default: null },
    balanceAfter: { type: Number, required: true },
    status: { type: String, enum: ['success', 'pending', 'failed'], default: 'success' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('WalletTransaction', walletTransactionSchema);
