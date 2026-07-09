const Parcel = require('../models/Parcel');
const Driver = require('../models/Driver');
const User = require('../models/User');
const WalletTransaction = require('../models/WalletTransaction');

// @desc    Accept a pending parcel request
// @route   PUT /api/driver/parcels/:id/accept
// @access  Private (driver)
const acceptParcel = async (req, res, next) => {
  try {
    const driver = req.driver;

    if (!driver.isOnline || !driver.isAvailable) {
      return res.status(400).json({ success: false, message: 'You must be online and available to accept parcels' });
    }

    const existingActive = await Parcel.findOne({
      driver: driver._id,
      status: { $in: ['accepted', 'picked_up', 'in_transit'] },
    });
    if (existingActive) {
      return res.status(400).json({ success: false, message: 'You already have an active parcel delivery' });
    }

    const parcel = await Parcel.findOne({ _id: req.params.id, status: 'requested' });
    if (!parcel) {
      return res.status(404).json({ success: false, message: 'Parcel request no longer available' });
    }

    parcel.driver = driver._id;
    parcel.status = 'accepted';
    await parcel.save();

    driver.isAvailable = false;
    await driver.save();

    const io = req.app.get('io');
    if (io) io.to(`parcel_${parcel._id}`).emit('parcel_status_update', { status: 'accepted', driverId: driver._id });

    res.status(200).json({ success: true, message: 'Parcel accepted', parcel });
  } catch (error) {
    next(error);
  }
};

// @desc    Mark parcel as picked up from sender
// @route   PUT /api/driver/parcels/:id/pickup
// @access  Private (driver)
const pickupParcel = async (req, res, next) => {
  try {
    const parcel = await Parcel.findOne({ _id: req.params.id, driver: req.driver._id, status: 'accepted' });
    if (!parcel) {
      return res.status(404).json({ success: false, message: 'Parcel not found or not in accepted state' });
    }

    parcel.status = 'picked_up';
    parcel.pickedUpAt = new Date();
    await parcel.save();

    const io = req.app.get('io');
    if (io) io.to(`parcel_${parcel._id}`).emit('parcel_status_update', { status: 'picked_up' });

    res.status(200).json({ success: true, message: 'Parcel picked up', parcel });
  } catch (error) {
    next(error);
  }
};

// @desc    Mark parcel as in transit
// @route   PUT /api/driver/parcels/:id/in-transit
// @access  Private (driver)
const markInTransit = async (req, res, next) => {
  try {
    const parcel = await Parcel.findOne({ _id: req.params.id, driver: req.driver._id, status: 'picked_up' });
    if (!parcel) {
      return res.status(404).json({ success: false, message: 'Parcel not found or not picked up yet' });
    }

    parcel.status = 'in_transit';
    await parcel.save();

    const io = req.app.get('io');
    if (io) io.to(`parcel_${parcel._id}`).emit('parcel_status_update', { status: 'in_transit' });

    res.status(200).json({ success: true, message: 'Parcel in transit', parcel });
  } catch (error) {
    next(error);
  }
};

// @desc    Deliver parcel after verifying receiver's OTP, settle payment
// @route   PUT /api/driver/parcels/:id/deliver
// @access  Private (driver)
const deliverParcel = async (req, res, next) => {
  try {
    const { otp } = req.body;
    if (!otp) {
      return res.status(400).json({ success: false, message: 'Receiver OTP is required to complete delivery' });
    }

    const parcel = await Parcel.findOne({
      _id: req.params.id,
      driver: req.driver._id,
      status: { $in: ['picked_up', 'in_transit'] },
    });
    if (!parcel) {
      return res.status(404).json({ success: false, message: 'Parcel not found or not eligible for delivery' });
    }

    if (parcel.receiverOtp !== otp) {
      return res.status(400).json({ success: false, message: 'Incorrect receiver OTP' });
    }

    parcel.status = 'delivered';
    parcel.deliveredAt = new Date();

    const driver = await Driver.findById(req.driver._id);

    if (parcel.paymentMethod === 'wallet') {
      const customer = await User.findById(parcel.customer);
      if (customer.walletBalance < parcel.charges.totalCharge) {
        return res.status(400).json({ success: false, message: 'Customer has insufficient wallet balance' });
      }
      customer.walletBalance -= parcel.charges.totalCharge;
      await customer.save();
      await WalletTransaction.create({
        ownerType: 'User',
        owner: customer._id,
        type: 'debit',
        amount: parcel.charges.totalCharge,
        reason: 'parcel_payment',
        referenceId: parcel._id,
        balanceAfter: customer.walletBalance,
      });

      driver.walletBalance += parcel.charges.totalCharge;
      await WalletTransaction.create({
        ownerType: 'Driver',
        owner: driver._id,
        type: 'credit',
        amount: parcel.charges.totalCharge,
        reason: 'parcel_payment',
        referenceId: parcel._id,
        balanceAfter: driver.walletBalance,
      });
    }

    parcel.paymentStatus = parcel.paymentMethod === 'cash' ? 'pending' : 'paid';
    await parcel.save();

    driver.isAvailable = true;
    driver.totalParcels += 1;
    driver.earningsToday += parcel.charges.totalCharge;
    await driver.save();

    const io = req.app.get('io');
    if (io) io.to(`parcel_${parcel._id}`).emit('parcel_status_update', { status: 'delivered' });

    res.status(200).json({ success: true, message: 'Parcel delivered successfully', parcel });
  } catch (error) {
    next(error);
  }
};

// @desc    Get driver's currently active parcel
// @route   GET /api/driver/parcels/active
// @access  Private (driver)
const getActiveParcel = async (req, res, next) => {
  try {
    const parcel = await Parcel.findOne({
      driver: req.driver._id,
      status: { $in: ['accepted', 'picked_up', 'in_transit'] },
    });

    res.status(200).json({ success: true, parcel: parcel || null });
  } catch (error) {
    next(error);
  }
};

// @desc    Driver cancels an accepted parcel (only before pickup)
// @route   PUT /api/driver/parcels/:id/cancel
// @access  Private (driver)
const cancelParcel = async (req, res, next) => {
  try {
    const { reason } = req.body;
    const parcel = await Parcel.findOne({ _id: req.params.id, driver: req.driver._id, status: 'accepted' });
    if (!parcel) {
      return res.status(404).json({ success: false, message: 'Parcel not found or cannot be cancelled at this stage' });
    }

    parcel.status = 'cancelled';
    parcel.cancelReason = reason || 'Cancelled by driver';
    parcel.cancelledBy = 'driver';
    parcel.driver = null;
    await parcel.save();

    await Driver.findByIdAndUpdate(req.driver._id, { isAvailable: true });

    const io = req.app.get('io');
    if (io) io.to(`parcel_${parcel._id}`).emit('parcel_status_update', { status: 'cancelled', cancelledBy: 'driver' });

    res.status(200).json({ success: true, message: 'Parcel cancelled', parcel });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  acceptParcel,
  pickupParcel,
  markInTransit,
  deliverParcel,
  getActiveParcel,
  cancelParcel,
};
