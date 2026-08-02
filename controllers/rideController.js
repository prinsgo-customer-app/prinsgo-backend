const Ride = require('../models/Ride'); // Adjust path to your Ride model

const bookRide = async (req, res) => {
  try {
    const { pickup, drop, vehicleType, paymentMethod } = req.body;

    // Strict validation matching exact nested structure
    if (
      !pickup ||
      !pickup.address ||
      !drop ||
      !drop.address ||
      !vehicleType
    ) {
      return res.status(400).json({
        success: false,
        message: 'Pickup, drop, and vehicle type are required',
      });
    }

    // Validate coordinates are valid numbers
    const pickupLat = Number(pickup.lat);
    const pickupLng = Number(pickup.lng);
    const dropLat = Number(drop.lat);
    const dropLng = Number(drop.lng);

    if (
      isNaN(pickupLat) ||
      isNaN(pickupLng) ||
      isNaN(dropLat) ||
      isNaN(dropLng)
    ) {
      return res.status(400).json({
        success: false,
        message: 'Valid numeric latitude and longitude are required for pickup and drop',
      });
    }

    const allowedVehicleTypes = ['bike', 'auto', 'car_mini', 'car_sedan'];
    if (!allowedVehicleTypes.includes(vehicleType)) {
      return res.status(400).json({
        success: false,
        message: `Invalid vehicleType. Must be one of: ${allowedVehicleTypes.join(', ')}`,
      });
    }

    // Create ride document in MongoDB
    const newRide = await Ride.create({
      customer: req.user._id,
      pickup: {
        address: pickup.address.trim(),
        lat: pickupLat,
        lng: pickupLng,
      },
      drop: {
        address: drop.address.trim(),
        lat: dropLat,
        lng: dropLng,
      },
      vehicleType,
      paymentMethod: paymentMethod || 'cash',
      status: 'searching',
      createdAt: new Date(),
    });

    // Populate customer details for Socket.IO broadcast to Driver App
    const populatedRide = await Ride.findById(newRide._id).populate(
      'customer',
      'name phone email'
    );

    // Broadcast to Driver App via Socket.IO
    const io = req.app.get('io');
    if (io) {
      io.emit('new_ride', populatedRide);
    }

    return res.status(201).json({
      success: true,
      message: 'Ride booked successfully',
      ride: populatedRide,
    });
  } catch (error) {
    console.error('Error in bookRide controller:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error while booking ride',
      error: error.message,
    });
  }
};

module.exports = {
  bookRide,
};
