const mongoose = require('mongoose');

const adminSettingsSchema = new mongoose.Schema(
  {
    // Payment & Bank Details
    upiId: { type: String, default: '' },
    qrCodeImageUrl: { type: String, default: '' },
    bankAccountName: { type: String, default: '' },
    bankAccountNumber: { type: String, default: '' },
    bankIfsc: { type: String, default: '' },
    bankName: { type: String, default: '' },

    // Support Contact Info
    supportPhone: { type: String, default: '' },
    supportEmail: { type: String, default: '' },

    // CMS & Legal Content Fields
    terms: { type: String, default: '' },
    privacy: { type: String, default: '' },
    about: { type: String, default: '' },
    faq: { type: String, default: '' },
    faqs: { type: mongoose.Schema.Types.Mixed, default: [] },
    cmsPages: { type: mongoose.Schema.Types.Mixed, default: [] },

    // Audience-Specific CMS Fields (Customer / Driver)
    customerTerms: { type: String, default: '' },
    customerPrivacy: { type: String, default: '' },
    customerAbout: { type: String, default: '' },
    driverTerms: { type: String, default: '' },
    driverPrivacy: { type: String, default: '' },
    driverAbout: { type: String, default: '' },

    // Explore Cities CMS (tourist destinations shown in Customer App)
    explore_cities_list: { type: mongoose.Schema.Types.Mixed, default: [] },
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
