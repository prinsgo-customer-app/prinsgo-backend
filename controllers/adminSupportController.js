const SupportTicket = require('../models/SupportTicket');

// @desc    List all support tickets with filters and pagination
// @route   GET /api/admin/support/tickets
// @access  Private (admin)
const listAllTickets = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const { status, category } = req.query;

    const query = {};
    if (status) query.status = status;
    if (category) query.category = category;

    const tickets = await SupportTicket.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('customer', 'name phone email');

    const total = await SupportTicket.countDocuments(query);

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

// @desc    Get support ticket details for admin
// @route   GET /api/admin/support/tickets/:id
// @access  Private (admin)
const getAdminTicketById = async (req, res, next) => {
  try {
    const ticket = await SupportTicket.findById(req.params.id).populate('customer', 'name phone email');

    if (!ticket) {
      return res.status(404).json({ success: false, message: 'Ticket not found' });
    }

    res.status(200).json({ success: true, ticket });
  } catch (error) {
    next(error);
  }
};

// @desc    Update support ticket status
// @route   PUT /api/admin/support/tickets/:id/status
// @access  Private (admin)
const updateTicketStatus = async (req, res, next) => {
  try {
    const { status } = req.body;

    const validStatuses = ['open', 'in_progress', 'resolved', 'closed'];
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: 'Valid status is required' });
    }

    const ticket = await SupportTicket.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true, runValidators: true }
    ).populate('customer', 'name phone email');

    if (!ticket) {
      return res.status(404).json({ success: false, message: 'Ticket not found' });
    }

    res.status(200).json({ success: true, message: `Ticket status updated to ${status}`, ticket });
  } catch (error) {
    next(error);
  }
};

// @desc    Admin reply to support ticket
// @route   POST /api/admin/support/tickets/:id/replies
// @access  Private (admin)
const adminReplyToTicket = async (req, res, next) => {
  try {
    const { message } = req.body;

    if (!message || message.trim() === '') {
      return res.status(400).json({ success: false, message: 'Reply message cannot be empty' });
    }

    const ticket = await SupportTicket.findById(req.params.id);

    if (!ticket) {
      return res.status(404).json({ success: false, message: 'Ticket not found' });
    }

    ticket.replies.push({
      sender: 'admin',
      message: message.trim(),
    });

    // Auto set status to in_progress or resolved when admin replies
    if (ticket.status === 'open') {
      ticket.status = 'in_progress';
    }

    await ticket.save();

    res.status(200).json({ success: true, message: 'Admin reply added successfully', ticket });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  listAllTickets,
  getAdminTicketById,
  updateTicketStatus,
  adminReplyToTicket,
};
