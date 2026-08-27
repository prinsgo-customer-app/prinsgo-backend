const express = require('express');
const router = express.Router();
const {
  getPublicBanners,
  getPublicToggles,
  getPublicSettings,
  getAppConfig,
} = require('../controllers/publicController');

// Public Banners
router.get('/banners', getPublicBanners);
router.get('/v1/home/banners', getPublicBanners);

// Public Feature Toggles
router.get('/toggles', getPublicToggles);

// Public Settings & CMS Content
router.get('/settings', getPublicSettings);
router.get('/config/settings', getPublicSettings);
router.get('/v1/config', getAppConfig);
router.get('/cms', getPublicSettings);

module.exports = router;
