const WorkerCategory = require('../models/WorkerCategory');
const Driver = require('../models/Driver');
const WorkerBooking = require('../models/WorkerBooking');
const AdminSettings = require('../models/AdminSettings');

// @desc    Get all active worker categories
// @route   GET /api/workers/categories
// @access  Public (Customer)
const getCategories = async (req, res, next) => {
  try {
    const categories = await WorkerCategory.find({ isActive: true }).sort({ displayOrder: 1 }).lean();
    res.status(200).json({ success: true, categories });
  } catch (error) {
    next(error);
  }
};

// @desc    Get eligible workers based on filters
// @route   GET /api/workers
// @access  Public (Customer)
const getWorkers = async (req, res, next) => {
  try {
    const { categoryId, category, search, lat, lng, radius } = req.query;
    const catId = categoryId || category;

    let query = {
      isWorker: true,
      isApproved: true,
      isBlocked: false,
      isAvailable: true,
      isOnline: true,
    };

    if (catId) {
      query.workerServiceCategories = catId;
    }

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { about: { $regex: search, $options: 'i' } },
      ];
    }

    if (lat && lng) {
      const distance = radius ? parseInt(radius) : 15000; // default 15km
      query.currentLocation = {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [parseFloat(lng), parseFloat(lat)],
          },
          $maxDistance: distance,
        },
      };
    }

    const workers = await Driver.find(query)
      .select('name profileImage rating experience about basePrice workerServiceCategories totalWorkerJobs currentLocation packages gallery')
      .populate('workerServiceCategories', 'name slug icon')
      .lean();

    res.status(200).json({ success: true, workers });
  } catch (error) {
    next(error);
  }
};

// @desc    Get worker details by ID
// @route   GET /api/workers/:id
// @access  Public (Customer)
const getWorkerById = async (req, res, next) => {
  try {
    const worker = await Driver.findOne({
      _id: req.params.id,
      isWorker: true,
    })
      .select('-phone -email -walletBalance -earningsToday -isPhoneVerified -isBlocked -isApproved -documents -documentStatus -vehicleNumber -vehicleType')
      .populate('workerServiceCategories', 'name slug icon')
      .lean();

    if (!worker) {
      return res.status(404).json({ success: false, message: 'Worker not found' });
    }

    res.status(200).json({ success: true, worker });
  } catch (error) {
    next(error);
  }
};

// @desc    Create a new worker booking
// @route   POST /api/workers/bookings
// @access  Private (Customer)
const createWorkerBooking = async (req, res, next) => {
  try {
    const { workerId, categoryId, location, date, time, taskDescription, paymentMethod, attachments } = req.body;

    if (!workerId || !categoryId || !location || !date || !time || !taskDescription) {
      return res.status(400).json({ success: false, message: 'Missing required booking fields' });
    }

    // Check if worker exists and is available
    const worker = await Driver.findOne({ _id: workerId, isWorker: true, isApproved: true, isBlocked: false });
    if (!worker) {
      return res.status(404).json({ success: false, message: 'Worker not found or unavailable' });
    }

    // Check if category exists and is active
    const category = await WorkerCategory.findOne({ _id: categoryId, isActive: true });
    if (!category) {
      return res.status(400).json({ success: false, message: 'Invalid or inactive service category' });
    }

    // Ensure the worker supports this category
    if (!worker.workerServiceCategories.includes(categoryId)) {
        return res.status(400).json({ success: false, message: 'Worker does not support this service category' });
    }

    // Check for double booking - consider any booking on the same date within 2 hours of this time as an overlap
    // For a robust system we'd use duration, but for now we'll match exact date and check hour overlap roughly.
    const bookingDate = new Date(date);
    const startOfDay = new Date(bookingDate.setHours(0,0,0,0));
    const endOfDay = new Date(bookingDate.setHours(23,59,59,999));

    // We'll just fetch active bookings on the same day and do a simple string comparison on time
    // Assuming format is HH:MM. For production we should parse the times.
    const activeDayBookings = await WorkerBooking.find({
      worker: workerId,
      date: { $gte: startOfDay, $lte: endOfDay },
      status: { $in: ['pending', 'accepted', 'on_the_way', 'arrived', 'in_progress'] }
    });

    const requestedHour = parseInt(time.split(':')[0], 10);
    const hasOverlap = activeDayBookings.some(b => {
        const bookedHour = parseInt(b.time.split(':')[0], 10);
        return Math.abs(requestedHour - bookedHour) < 2; // block +/- 1 hour
    });

    if (hasOverlap) {
        return res.status(409).json({ success: false, message: 'Worker is already booked near this time slot' });
    }

    // Calculate Pricing
    const settings = await AdminSettings.getSingleton();
    const platformFee = settings.workerPlatformFee || 50;
    const calculatedBase = worker.basePrice || 0;
    const totalAmount = calculatedBase + platformFee;

    const booking = await WorkerBooking.create({
      customer: req.user._id,
      worker: workerId,
      category: categoryId,
      location,
      date,
      time,
      taskDescription,
      attachments: attachments || [],
      pricing: {
        basePrice: calculatedBase,
        platformFee,
        totalAmount,
      },
      paymentMethod: paymentMethod || 'cash',
    });

    res.status(201).json({ success: true, message: 'Worker booking created', booking });
  } catch (error) {
    next(error);
  }
};

// @desc    Get worker booking by ID
// @route   GET /api/workers/bookings/:id
// @access  Private (Customer)
const getWorkerBookingById = async (req, res, next) => {
  try {
    const booking = await WorkerBooking.findById(req.params.id)
      .populate('worker', 'name profileImage phone rating workerServiceCategories')
      .populate('customer', 'name phone profileImage')
      .populate('category', 'name slug icon')
      .lean();

    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    if (booking.customer._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized to view this booking' });
    }

    res.status(200).json({ success: true, booking });
  } catch (error) {
    next(error);
  }
};

// @desc    Review a completed worker booking
// @route   PUT /api/workers/bookings/:id/review
// @access  Private (Customer)
const reviewWorkerBooking = async (req, res, next) => {
  try {
    const { rating, review } = req.body;

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ success: false, message: 'Please provide a valid rating between 1 and 5' });
    }

    const booking = await WorkerBooking.findOne({
      _id: req.params.id,
      customer: req.user._id,
      status: 'completed'
    });

    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found or not completed' });
    }

    if (booking.customerRating) {
      return res.status(400).json({ success: false, message: 'You have already reviewed this booking' });
    }

    booking.customerRating = rating;
    booking.customerReview = review || '';
    await booking.save();

    // Update worker's average rating based on all reviews
    const worker = await Driver.findById(booking.worker);
    if (worker) {
        const allRatedJobs = await WorkerBooking.find({
            worker: booking.worker,
            customerRating: { $exists: true, $ne: null }
        });

        let sum = 0;
        allRatedJobs.forEach(job => {
            sum += job.customerRating;
        });

        const avgRating = allRatedJobs.length > 0 ? sum / allRatedJobs.length : 5.0;
        worker.rating = Math.round(avgRating * 10) / 10;
        await worker.save();
    }

    res.status(200).json({ success: true, message: 'Review submitted successfully', booking });
  } catch (error) {
    next(error);
  }
};


module.exports = {
  getCategories,
  getWorkers,
  getWorkerById,
  createWorkerBooking,
  getWorkerBookingById,
  reviewWorkerBooking,
};
