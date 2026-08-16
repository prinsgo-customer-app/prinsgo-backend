const express = require('express');
const router = express.Router();
const {
  getPublicBanners,
  getPublicToggles,
  getPublicSettings,
} = require('../controllers/publicController');

// Public Banners
router.get('/banners', getPublicBanners);

// Public Feature Toggles
router.get('/toggles', getPublicToggles);

// Public Settings & CMS Content
router.get('/settings', getPublicSettings);
router.get('/config/settings', getPublicSettings);
router.get('/cms', getPublicSettings);

module.exports = router;
