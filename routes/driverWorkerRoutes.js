const express = require('express');
const router = express.Router();
const { protectDriver } = require('../middleware/auth');
const {
  updateWorkerProfile,
  getWorkerJobs,
  updateJobStatus,
} = require('../controllers/driverWorkerController');

router.use(protectDriver);

router.put('/profile', updateWorkerProfile);
router.get('/jobs', getWorkerJobs);
router.put('/jobs/:id/status', updateJobStatus);

module.exports = router;
