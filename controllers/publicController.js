const Banner = require('../models/Banner');
const FeatureToggle = require('../models/FeatureToggle');
const AdminSettings = require('../models/AdminSettings');

// @desc    Get active banners for customer and driver apps
// @route   GET /api/banners
// @access  Public
const getPublicBanners = async (req, res, next) => {
  try {
    const banners = await Banner.find({ isActive: true }).sort({ order: 1, createdAt: -1 }).lean();
    res.status(200).json({ success: true, banners });
  } catch (error) {
    next(error);
  }
};

// @desc    Get active feature toggles for customer and driver apps
// @route   GET /api/toggles
// @access  Public
const getPublicToggles = async (req, res, next) => {
  try {
    const toggles = await FeatureToggle.find().sort({ key: 1 }).lean();
    res.status(200).json({ success: true, toggles });
  } catch (error) {
    next(error);
  }
};

// @desc    Get platform settings and CMS content for customer and driver apps (Sanitized Public DTO)
// @route   GET /api/settings, GET /api/config/settings, GET /api/cms
// @access  Public
const getPublicSettings = async (req, res, next) => {
  try {
    const settingsDoc = await AdminSettings.getSingleton();
    const settingsObj = settingsDoc.toObject ? settingsDoc.toObject() : settingsDoc;

    // Security DTO: Strip out sensitive bank details and internal administrative fields
    const {
      bankAccountName,
      bankAccountNumber,
      bankIfsc,
      bankName,
      __v,
      ...safePublicSettings
    } = settingsObj;

    res.status(200).json({ success: true, settings: safePublicSettings });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getPublicBanners,
  getPublicToggles,
  getPublicSettings,
};
