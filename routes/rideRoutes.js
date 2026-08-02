const express = require('express');
const router = express.Router();

// 1. auth.js से protect मिडलवेयर इंपोर्ट करें
const { protect } = require('../middleware/auth');

// 2. controllers इंपोर्ट करें
const {
  estimateFare,
  bookRide,
  getActiveRide,
  getRideById,
  getRideHistory,
  cancelRide,
  rateRide,
} = require('../controllers/rideController');

// Estimate fare (बिना auth या auth के साथ जैसा आपकी जरूरत हो)
router.post('/estimate', estimateFare);

// Book ride (सुरक्षित /book राउट - इसमें protect मिडलवेयर लगाना जरूरी है)
router.post('/book', protect, bookRide);

// Active ride
router.get('/active', protect, getActiveRide);

// Ride history
router.get('/history/:userId', protect, getRideHistory);

// Single ride details
router.get('/:id', protect, getRideById);

// Cancel ride
router.put('/:id/cancel', protect, cancelRide);

// Rate ride
router.post('/:id/rate', protect, rateRide);

module.exports = router;
