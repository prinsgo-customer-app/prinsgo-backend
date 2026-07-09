const express = require('express');
const router = express.Router();
const { protectDriver } = require('../middleware/auth');
const {
  toggleOnlineStatus,
  updateLocation,
  getNearbyRequests,
  getEarnings,
} = require('../controllers/driverController');

router.use(protectDriver);

router.put('/status', toggleOnlineStatus);
router.put('/location', updateLocation);
router.get('/nearby-requests', getNearbyRequests);
router.get('/earnings', getEarnings);

module.exports = router;
