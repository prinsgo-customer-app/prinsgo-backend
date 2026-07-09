const express = require('express');
const router = express.Router();
const { protectAdmin } = require('../middleware/auth');

const { getDashboard, getEarningsReport, getUsersReport, getReferralReport } = require('../controllers/adminController');
const {
  listCustomers,
  getCustomerById,
  blockCustomer,
  unblockCustomer,
} = require('../controllers/adminCustomerController');
const {
  listDrivers,
  getDriverById,
  approveDriver,
  rejectDriver,
  blockDriver,
  unblockDriver,
} = require('../controllers/adminDriverController');
const {
  listRides,
  getRideById,
  forceCancelRide,
  listParcels,
  getParcelById,
  forceCancelParcel,
} = require('../controllers/adminOperationsController');
const { adjustWallet, listWalletTransactions } = require('../controllers/adminWalletController');
const { listBanners, createBanner, updateBanner, deleteBanner } = require('../controllers/adminBannerController');
const { listToggles, createToggle, setToggle } = require('../controllers/adminToggleController');
const { getSettings, updateSettings } = require('../controllers/adminSettingsController');
const {
  broadcastNotification,
  getNotificationHistory,
} = require('../controllers/adminNotificationController');

// All admin routes require the x-admin-secret header
router.use(protectAdmin);

// Dashboard & Reports
router.get('/dashboard', getDashboard);
router.get('/reports/earnings', getEarningsReport);
router.get('/reports/users', getUsersReport);
router.get('/reports/referrals', getReferralReport);

// Customers
router.get('/customers', listCustomers);
router.get('/customers/:id', getCustomerById);
router.put('/customers/:id/block', blockCustomer);
router.put('/customers/:id/unblock', unblockCustomer);

// Drivers
router.get('/drivers', listDrivers);
router.get('/drivers/:id', getDriverById);
router.put('/drivers/:id/approve', approveDriver);
router.put('/drivers/:id/reject', rejectDriver);
router.put('/drivers/:id/block', blockDriver);
router.put('/drivers/:id/unblock', unblockDriver);

// Ride Management
router.get('/rides', listRides);
router.get('/rides/:id', getRideById);
router.put('/rides/:id/cancel', forceCancelRide);

// Parcel Management
router.get('/parcels', listParcels);
router.get('/parcels/:id', getParcelById);
router.put('/parcels/:id/cancel', forceCancelParcel);

// Wallet
router.post('/wallet/adjust', adjustWallet);
router.get('/wallet/transactions', listWalletTransactions);

// Banners
router.get('/banners', listBanners);
router.post('/banners', createBanner);
router.put('/banners/:id', updateBanner);
router.delete('/banners/:id', deleteBanner);

// Feature Toggles
router.get('/toggles', listToggles);
router.post('/toggles', createToggle);
router.put('/toggles/:key', setToggle);

// Settings (UPI / QR / Bank / Support)
router.get('/settings', getSettings);
router.put('/settings', updateSettings);

// Notifications
router.post('/notifications/broadcast', broadcastNotification);
router.get('/notifications/history', getNotificationHistory);

module.exports = router;
