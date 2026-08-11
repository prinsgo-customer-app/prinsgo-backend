const express = require('express');
const router = express.Router();
const { protectCustomer } = require('../middleware/auth');
const {
  createTicket,
  getMyTickets,
  getTicketById,
  addReply,
} = require('../controllers/supportController');

// All customer support routes require authentication
router.use(protectCustomer);

router.post('/tickets', createTicket);
router.get('/tickets', getMyTickets);
router.get('/tickets/:id', getTicketById);
router.post('/tickets/:id/replies', addReply);

module.exports = router;
