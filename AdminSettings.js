const mongoose = require('mongoose');

const adminSettingsSchema = new mongoose.Schema(
  {
    upiId: { type: String, default: '' },
    qrCodeImageUrl: { type: String, default: '' },
    bankAccountName: { type: String, default: '' },
    bankAccountNumber: { type: String, default: '' },
    bankIfsc: { type: String, default: '' },
    bankName: { type: String, default: '' },
    supportPhone: { type: String, default: '' },
    supportEmail: { type: String, default: '' },
  },
  { timestamps: true }
);

// Singleton pattern - only one settings document should ever exist
adminSettingsSchema.statics.getSingleton = async function () {
  let settings = await this.findOne();
  if (!settings) {
    settings = await this.create({});
  }
  return settings;
};

module.exports = mongoose.model('AdminSettings', adminSettingsSchema);
