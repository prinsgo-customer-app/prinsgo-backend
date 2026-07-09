const AdminSettings = require('../models/AdminSettings');

// @desc    Get platform settings (UPI, QR, bank details, support info)
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

// @desc    Update platform settings
// @route   PUT /api/admin/settings
// @access  Private (admin)
const updateSettings = async (req, res, next) => {
  try {
    const settings = await AdminSettings.getSingleton();

    const allowedFields = [
      'upiId',
      'qrCodeImageUrl',
      'bankAccountName',
      'bankAccountNumber',
      'bankIfsc',
      'bankName',
      'supportPhone',
      'supportEmail',
    ];
    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) settings[field] = req.body[field];
    });

    await settings.save();
    res.status(200).json({ success: true, message: 'Settings updated', settings });
  } catch (error) {
    next(error);
  }
};

module.exports = { getSettings, updateSettings };
