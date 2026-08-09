const Razorpay = require('razorpay');
const crypto = require('crypto');
const Ride = require('../models/Ride');

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// @desc    Create a Razorpay order for a ride
// @route   POST /api/payment/create-order
// @access  Private (customer)
const createOrder = async (req, res, next) => {
  try {
    const { rideId } = req.body;

    const ride = await Ride.findOne({ _id: rideId, customer: req.user._id });
    if (!ride) {
      return res.status(404).json({ success: false, message: 'Ride not found' });
    }

    if (ride.paymentStatus === 'paid') {
      return res.status(400).json({ success: false, message: 'Ride is already paid' });
    }

    // Razorpay amount is in paise (multiply by 100)
    const amount = Math.round(ride.fare.totalFare * 100);

    const options = {
      amount,
      currency: 'INR',
      receipt: `receipt_ride_${ride._id}`,
    };

    const order = await razorpay.orders.create(options);

    res.status(200).json({
      success: true,
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Verify Razorpay payment signature
// @route   POST /api/payment/verify
// @access  Private (customer)
const verifyPayment = async (req, res, next) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, rideId } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !rideId) {
      return res.status(400).json({ success: false, message: 'Missing payment details' });
    }

    const ride = await Ride.findOne({ _id: rideId, customer: req.user._id });
    if (!ride) {
      return res.status(404).json({ success: false, message: 'Ride not found' });
    }

    if (ride.paymentStatus === 'paid') {
      return res.status(200).json({ success: true, message: 'Payment already verified' });
    }

    const secret = process.env.RAZORPAY_KEY_SECRET;
    const generated_signature = crypto
      .createHmac('sha256', secret)
      .update(razorpay_order_id + '|' + razorpay_payment_id)
      .digest('hex');

    if (generated_signature !== razorpay_signature) {
      return res.status(400).json({ success: false, message: 'Invalid payment signature' });
    }

    // Payment is valid, update ride status
    ride.paymentStatus = 'paid';
    ride.paymentMethod = 'upi'; // or 'card' depending on what frontend sends/we track
    await ride.save();

    res.status(200).json({ success: true, message: 'Payment verified successfully' });
  } catch (error) {
    next(error);
  }
};

module.exports = { createOrder, verifyPayment };
