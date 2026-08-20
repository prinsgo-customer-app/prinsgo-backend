const AdminSettings = require('../models/AdminSettings');

// @desc    Get platform settings and CMS content
// @route   GET /api/admin/settings
// @access  Private (admin)
const getSettings = async (req, res, next) => {
  try {
    const settings = await AdminSettings.getSingleton();
    res.status(200).json({ success: true, settings });
  } catch (error) {
    next(error);
  }
};

// @desc    Update platform settings and CMS content
// @route   PUT /api/admin/settings
// @access  Private (admin)
const updateSettings = async (req, res, next) => {
  try {
    const existingSettings = await AdminSettings.getSingleton();

    const allowedFields = [
      'upiId',
      'qrCodeImageUrl',
      'bankAccountName',
      'bankAccountNumber',
      'bankIfsc',
      'bankName',
      'supportPhone',
      'supportEmail',
      'terms',
      'privacy',
      'about',
      'faq',
      'faqs',
      'cmsPages',
      'customerTerms',
      'customerPrivacy',
      'customerAbout',
      'driverTerms',
      'driverPrivacy',
      'driverAbout',
      'explore_cities_list',
    ];

    const updateData = {};
    allowedFields.forEach((field) => {
      if (req.body && req.body[field] !== undefined) {
        updateData[field] = req.body[field];
      }
    });

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No valid settings or CMS fields provided for update',
      });
    }

    const updatedSettings = await AdminSettings.findOneAndUpdate(
      { _id: existingSettings._id },
      { $set: updateData },
      { new: true, runValidators: true }
    );

    if (!updatedSettings) {
      return res.status(500).json({
        success: false,
        message: 'Failed to update settings in database',
      });
    }

    // Confirm persistence directly from MongoDB
    const persistedSettings = await AdminSettings.findById(existingSettings._id).lean();

    res.status(200).json({
      success: true,
      message: 'Settings updated',
      settings: persistedSettings || updatedSettings,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { getSettings, updateSettings };
