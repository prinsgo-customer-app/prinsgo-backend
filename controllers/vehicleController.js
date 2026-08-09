const VehicleType = require('../models/VehicleType');

// @desc    Get all active vehicle types
// @route   GET /api/vehicles
// @access  Public / Private (customer)
const getVehicleTypes = async (req, res, next) => {
  try {
    const vehicles = await VehicleType.find({ isActive: true }).sort({ ordering: 1 });
    res.status(200).json({ success: true, vehicles });
  } catch (error) {
    next(error);
  }
};

module.exports = { getVehicleTypes };
