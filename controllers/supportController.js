const SupportTicket = require('../models/SupportTicket');

// @desc    Create a new support ticket
// @route   POST /api/support/tickets
// @access  Private (customer)
const createTicket = async (req, res, next) => {
  try {
    const { subject, description, category } = req.body;

    if (!subject || !description) {
      return res.status(400).json({ success: false, message: 'Subject and description are required' });
    }

    const validCategories = ['ride', 'parcel', 'payment', 'wallet', 'other'];
    const cleanCategory = category && validCategories.includes(category) ? category : 'other';

    const ticket = await SupportTicket.create({
      customer: req.user._id,
      subject: subject.trim(),
      description: description.trim(),
      category: cleanCategory,
    });

    res.status(201).json({ success: true, message: 'Support ticket created successfully', ticket });
  } catch (error) {
    next(error);
  }
};

// @desc    Get customer's own support tickets
// @route   GET /api/support/tickets
// @access  Private (customer)
const getMyTickets = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;

    const tickets = await SupportTicket.find({ customer: req.user._id })
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    const total = await SupportTicket.countDocuments({ customer: req.user._id });

    res.status(200).json({
      success: true,
      tickets,
      page,
      totalPages: Math.ceil(total / limit),
      total,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get support ticket details
// @route   GET /api/support/tickets/:id
// @access  Private (customer)
const getTicketById = async (req, res, next) => {
  try {
    const ticket = await SupportTicket.findOne({ _id: req.params.id, customer: req.user._id });

    if (!ticket) {
      return res.status(404).json({ success: false, message: 'Ticket not found' });
    }

    res.status(200).json({ success: true, ticket });
  } catch (error) {
    next(error);
  }
};

// @desc    Add a reply to a support ticket
// @route   POST /api/support/tickets/:id/replies
// @access  Private (customer)
const addReply = async (req, res, next) => {
  try {
    const { message } = req.body;

    if (!message || message.trim() === '') {
      return res.status(400).json({ success: false, message: 'Reply message cannot be empty' });
    }

    const ticket = await SupportTicket.findOne({ _id: req.params.id, customer: req.user._id });

    if (!ticket) {
      return res.status(404).json({ success: false, message: 'Ticket not found' });
    }

    if (ticket.status === 'closed') {
      return res.status(400).json({ success: false, message: 'Cannot reply to a closed ticket' });
    }

    ticket.replies.push({
      sender: 'customer',
      message: message.trim(),
    });

    // Reopen ticket or set active status when customer replies
    if (ticket.status === 'resolved') {
      ticket.status = 'open';
    }

    await ticket.save();

    res.status(200).json({ success: true, message: 'Reply added successfully', ticket });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createTicket,
  getMyTickets,
  getTicketById,
  addReply,
};
