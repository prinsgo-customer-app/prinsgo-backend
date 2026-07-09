const Parcel = require('../models/Parcel');
const Driver = require('../models/Driver');
const { calculateParcelCharge } = require('../utils/fareCalculator');
const { getDistanceAndDuration } = require('../utils/mapsService');
const { generateOtpCode } = require('../utils/otpService');

const VALID_PARCEL_TYPES = ['document', 'food', 'electronics', 'clothing', 'fragile', 'other'];
const VALID_WEIGHTS = ['upto_1kg', 'upto_5kg', 'upto_10kg', 'upto_20kg'];

// @desc    Get charge estimate for a parcel before booking
// @route   POST /api/parcels/estimate
// @access  Private (customer)
const estimateParcelCharge = async (req, res, next) => {
  try {
    const { pickupLat, pickupLng, dropLat, dropLng, weightCategory } = req.body;

    if ([pickupLat, pickupLng, dropLat, dropLng].some((v) => v === undefined)) {
      return res.status(400).json({ success: false, message: 'Pickup and drop coordinates are required' });
    }
    if (!VALID_WEIGHTS.includes(weightCategory)) {
      return res.status(400).json({ success: false, message: 'Invalid weight category' });
    }

    const { distanceKm, durationMin } = await getDistanceAndDuration(
      pickupLat,
      pickupLng,
      dropLat,
      dropLng
    );

    const charges = calculateParcelCharge({ weightCategory, distanceKm });

    res.status(200).json({ success: true, distanceKm, durationMin, charges });
  } catch (error) {
    next(error);
  }
};

// @desc    Book a new parcel delivery
// @route   POST /api/parcels/book
// @access  Private (customer)
const bookParcel = async (req, res, next) => {
  try {
    const { pickup, drop, parcelType, weightCategory, paymentMethod } = req.body;

    if (!pickup?.address || !drop?.address) {
      return res.status(400).json({ success: false, message: 'Pickup and drop details are required' });
    }
    if (!pickup.contactName || !pickup.contactPhone || !drop.contactName || !drop.contactPhone) {
      return res.status(400).json({ success: false, message: 'Sender and receiver contact details are required' });
    }
    if (!/^[6-9]\d{9}$/.test(drop.contactPhone)) {
      return res.status(400).json({ success: false, message: 'Enter a valid receiver phone number' });
    }
    if (!VALID_PARCEL_TYPES.includes(parcelType)) {
      return res.status(400).json({ success: false, message: 'Invalid parcel type' });
    }
    if (!VALID_WEIGHTS.includes(weightCategory)) {
      return res.status(400).json({ success: false, message: 'Invalid weight category' });
    }

    const { distanceKm, durationMin } = await getDistanceAndDuration(
      pickup.lat,
      pickup.lng,
      drop.lat,
      drop.lng
    );

    const charges = calculateParcelCharge({ weightCategory, distanceKm });
    const receiverOtp = generateOtpCode().slice(0, 4);

    const parcel = await Parcel.create({
      customer: req.user._id,
      pickup,
      drop,
      parcelType,
      weightCategory,
      distanceKm,
      durationMin,
      charges,
      paymentMethod: paymentMethod || 'cash',
      receiverOtp,
    });

    // Notify all online drivers about the new parcel request
    const io = req.app.get('io');
    if (io) {
      io.emit('new_parcel_request', { parcelId: parcel._id, pickup });
    }

    res.status(201).json({ success: true, message: 'Parcel booked successfully', parcel });
  } catch (error) {
    next(error);
  }
};

// @desc    Get active parcels for customer
// @route   GET /api/parcels/active
// @access  Private (customer)
const getActiveParcels = async (req, res, next) => {
  try {
    const parcels = await Parcel.find({
      customer: req.user._id,
      status: { $in: ['requested', 'accepted', 'picked_up', 'in_transit'] },
    }).populate('driver', 'name phone vehicleNumber vehicleType currentLocation');

    res.status(200).json({ success: true, parcels });
  } catch (error) {
    next(error);
  }
};

// @desc    Get parcel details by ID
// @route   GET /api/parcels/:id
// @access  Private (customer)
const getParcelById = async (req, res, next) => {
  try {
    const parcel = await Parcel.findOne({ _id: req.params.id, customer: req.user._id }).populate(
      'driver',
      'name phone vehicleNumber vehicleType currentLocation'
    );

    if (!parcel) {
      return res.status(404).json({ success: false, message: 'Parcel not found' });
    }

    res.status(200).json({ success: true, parcel });
  } catch (error) {
    next(error);
  }
};

// @desc    Get parcel history
// @route   GET /api/parcels/history
// @access  Private (customer)
const getParcelHistory = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;

    const parcels = await Parcel.find({
      customer: req.user._id,
      status: { $in: ['delivered', 'cancelled'] },
    })
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    const total = await Parcel.countDocuments({
      customer: req.user._id,
      status: { $in: ['delivered', 'cancelled'] },
    });

    res.status(200).json({ success: true, parcels, page, totalPages: Math.ceil(total / limit), total });
  } catch (error) {
    next(error);
  }
};

// @desc    Cancel a parcel
// @route   PUT /api/parcels/:id/cancel
// @access  Private (customer)
const cancelParcel = async (req, res, next) => {
  try {
    const { reason } = req.body;
    const parcel = await Parcel.findOne({ _id: req.params.id, customer: req.user._id });

    if (!parcel) {
      return res.status(404).json({ success: false, message: 'Parcel not found' });
    }
    if (['delivered', 'cancelled'].includes(parcel.status)) {
      return res.status(400).json({ success: false, message: `Parcel already ${parcel.status}` });
    }
    if (['picked_up', 'in_transit'].includes(parcel.status)) {
      return res.status(400).json({ success: false, message: 'Cannot cancel after pickup' });
    }

    parcel.status = 'cancelled';
    parcel.cancelReason = reason || 'Cancelled by customer';
    parcel.cancelledBy = 'customer';
    await parcel.save();

    if (parcel.driver) {
      await Driver.findByIdAndUpdate(parcel.driver, { isAvailable: true });
    }

    res.status(200).json({ success: true, message: 'Parcel cancelled', parcel });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  estimateParcelCharge,
  bookParcel,
  getActiveParcels,
  getParcelById,
  getParcelHistory,
  cancelParcel,
};
