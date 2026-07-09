const express = require('express');
const router = express.Router();
const { protectCustomer } = require('../middleware/auth');
const { search, reverseGeocodeHandler, details } = require('../controllers/placesController');

router.use(protectCustomer);

router.get('/search', search);
router.get('/reverse-geocode', reverseGeocodeHandler);
router.get('/details', details);

module.exports = router;
