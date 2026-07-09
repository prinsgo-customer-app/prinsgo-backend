const express = require('express');
const router = express.Router();
const { protectCustomer } = require('../middleware/auth');
const { getMyTransactions } = require('../controllers/walletController');

router.use(protectCustomer);

router.get('/transactions', getMyTransactions);

module.exports = router;
