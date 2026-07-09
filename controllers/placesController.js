const { searchPlaces, reverseGeocode, getPlaceDetails } = require('../utils/mapsService');

// @desc    Autocomplete address search for pickup/drop picker
// @route   GET /api/places/search?input=&lat=&lng=
// @access  Private (customer)
const search = async (req, res, next) => {
  try {
    const { input, lat, lng } = req.query;
    if (!input || input.trim().length < 2) {
      return res.status(400).json({ success: false, message: 'input must be at least 2 characters' });
    }

    const predictions = await searchPlaces(input, lat, lng);
    res.status(200).json({ success: true, predictions });
  } catch (error) {
    next(error);
  }
};

// @desc    Reverse geocode coordinates into a readable address (used for "current location")
// @route   GET /api/places/reverse-geocode?lat=&lng=
// @access  Private (customer)
const reverseGeocodeHandler = async (req, res, next) => {
  try {
    const { lat, lng } = req.query;
    if (!lat || !lng) {
      return res.status(400).json({ success: false, message: 'lat and lng are required' });
    }

    const address = await reverseGeocode(lat, lng);
    res.status(200).json({ success: true, address });
  } catch (error) {
    next(error);
  }
};

// @desc    Get exact coordinates + address from a place_id after autocomplete selection
// @route   GET /api/places/details?placeId=
// @access  Private (customer)
const details = async (req, res, next) => {
  try {
    const { placeId } = req.query;
    if (!placeId) {
      return res.status(400).json({ success: false, message: 'placeId is required' });
    }

    const result = await getPlaceDetails(placeId);
    res.status(200).json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
};

module.exports = { search, reverseGeocodeHandler, details };
