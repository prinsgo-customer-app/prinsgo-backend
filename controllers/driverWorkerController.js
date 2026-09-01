const Driver = require('../models/Driver');
const WorkerBooking = require('../models/WorkerBooking');
const WorkerCategory = require('../models/WorkerCategory');

// @desc    Update worker profile and selected categories
// @route   PUT /api/driver/workers/profile
// @access  Private (Driver)
const updateWorkerProfile = async (req, res, next) => {
  try {
    const { experience, about, basePrice, categories } = req.body;

    // Ensure the user is a worker
    const driver = await Driver.findById(req.driver._id);
    if (!driver || !driver.isWorker) {
        return res.status(403).json({ success: false, message: 'Access denied. You are not registered as a worker.' });
    }

    if (experience !== undefined) driver.experience = experience;
    if (about !== undefined) driver.about = about;
    if (basePrice !== undefined) driver.basePrice = basePrice;

    if (categories && Array.isArray(categories)) {
        // Validate categories
        const validCategories = await WorkerCategory.find({ _id: { $in: categories }, isActive: true });
        if (validCategories.length !== categories.length) {
             return res.status(400).json({ success: false, message: 'One or more selected categories are invalid or inactive.' });
        }
        driver.workerServiceCategories = categories;
    }

    await driver.save();

    res.status(200).json({ success: true, message: 'Worker profile updated', profile: driver });

  } catch (error) {
    next(error);
  }
};

// @desc    Get jobs assigned to this worker
// @route   GET /api/driver/workers/jobs
// @access  Private (Driver)
const getWorkerJobs = async (req, res, next) => {
  try {
    const driverId = req.driver._id;
    const { status } = req.query; // optional filter

    let query = { worker: driverId };

    if (status) {
        if (status === 'ongoing') {
             query.status = { $in: ['pending', 'accepted', 'on_the_way', 'arrived', 'in_progress'] };
        } else {
             query.status = status;
        }
    }

    const jobs = await WorkerBooking.find(query)
      .populate('customer', 'name phone')
      .populate('category', 'name icon')
      .sort({ createdAt: -1 })
      .lean();

    res.status(200).json({ success: true, jobs });
  } catch (error) {
    next(error);
  }
};

// @desc    Update worker job status
// @route   PUT /api/driver/workers/jobs/:id/status
// @access  Private (Driver)
const updateJobStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    const allowedStatuses = ['accepted', 'on_the_way', 'arrived', 'in_progress', 'completed', 'rejected'];

    if (!allowedStatuses.includes(status)) {
         return res.status(400).json({ success: false, message: 'Invalid status transition' });
    }

    const job = await WorkerBooking.findOne({ _id: req.params.id, worker: req.driver._id });

    if (!job) {
         return res.status(404).json({ success: false, message: 'Job not found or not assigned to you' });
    }

    // Basic state machine validation
    const currentState = job.status;
    const validTransitions = {
        'pending': ['accepted', 'rejected'],
        'accepted': ['on_the_way', 'cancelled'], // Cancelled is handled elsewhere
        'on_the_way': ['arrived'],
        'arrived': ['in_progress'],
        'in_progress': ['completed'],
    };

    if (!validTransitions[currentState] || !validTransitions[currentState].includes(status)) {
        return res.status(409).json({ success: false, message: `Cannot transition job from ${currentState} to ${status}` });
    }

    job.status = status;

    if (status === 'accepted') job.acceptedAt = new Date();
    if (status === 'in_progress') job.startedAt = new Date();
    if (status === 'completed') {
        job.completedAt = new Date();
        job.paymentStatus = 'paid'; // simplify payment for now

        // Update earnings and job count
        const driver = await Driver.findById(req.driver._id);
        driver.totalWorkerJobs += 1;
        driver.earningsToday += (job.pricing.totalAmount - job.pricing.platformFee);
        driver.walletBalance += (job.pricing.totalAmount - job.pricing.platformFee);
        await driver.save();
    }

    await job.save();

    res.status(200).json({ success: true, message: `Job status updated to ${status}`, job });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  updateWorkerProfile,
  getWorkerJobs,
  updateJobStatus,
};
