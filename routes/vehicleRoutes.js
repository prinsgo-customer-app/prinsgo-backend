const express = require('express');
const router = express.Router();
const { getVehicleTypes } = require('../controllers/vehicleController');

router.get('/', getVehicleTypes);

module.exports = router;
