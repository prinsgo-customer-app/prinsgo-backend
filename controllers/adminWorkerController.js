const WorkerCategory = require('../models/WorkerCategory');
const Driver = require('../models/Driver');

// @desc    List all worker categories
// @route   GET /api/admin/workers/categories
// @access  Private (Admin)
const listCategories = async (req, res, next) => {
  try {
    const categories = await WorkerCategory.find().sort({ displayOrder: 1 }).lean();
    res.status(200).json({ success: true, categories });
  } catch (error) {
    next(error);
  }
};

// @desc    Create a new worker category
// @route   POST /api/admin/workers/categories
// @access  Private (Admin)
const createCategory = async (req, res, next) => {
  try {
    const { name, slug, description, icon, isActive, displayOrder } = req.body;

    if (!name || !slug) {
        return res.status(400).json({ success: false, message: 'Name and slug are required' });
    }

    const existing = await WorkerCategory.findOne({ slug });
    if (existing) {
        return res.status(400).json({ success: false, message: 'Category with this slug already exists' });
    }

    const category = await WorkerCategory.create({ name, slug, description, icon, isActive, displayOrder });
    res.status(201).json({ success: true, message: 'Category created successfully', category });
  } catch (error) {
    next(error);
  }
};

// @desc    Update worker category
// @route   PUT /api/admin/workers/categories/:id
// @access  Private (Admin)
const updateCategory = async (req, res, next) => {
  try {
    const category = await WorkerCategory.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });

    if (!category) {
        return res.status(404).json({ success: false, message: 'Category not found' });
    }

    res.status(200).json({ success: true, message: 'Category updated successfully', category });
  } catch (error) {
    next(error);
  }
};

// @desc    List all workers
// @route   GET /api/admin/workers
// @access  Private (Admin)
const listWorkers = async (req, res, next) => {
  try {
    const workers = await Driver.find({ isWorker: true })
        .populate('workerServiceCategories', 'name')
        .sort({ createdAt: -1 })
        .lean();
    res.status(200).json({ success: true, workers });
  } catch (error) {
    next(error);
  }
};


// @desc    Delete a worker category
// @route   DELETE /api/admin/workers/categories/:id
// @access  Private (Admin)
const deleteCategory = async (req, res, next) => {
  try {
    const category = await WorkerCategory.findByIdAndDelete(req.params.id);
    if (!category) {
      return res.status(404).json({ success: false, message: 'Category not found' });
    }
    res.status(200).json({ success: true, message: 'Category deleted successfully' });
  } catch (error) {
    next(error);
  }
};

// @desc    Get worker by ID
// @route   GET /api/admin/workers/:id
// @access  Private (Admin)
const getWorkerById = async (req, res, next) => {
  try {
    const worker = await Driver.findOne({ _id: req.params.id, isWorker: true })
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

// @desc    Create a new worker
// @route   POST /api/admin/workers
// @access  Private (Admin)
const createWorker = async (req, res, next) => {
  try {
    const {
      name, phone, email, profileImage, experience, about, basePrice,
      workerServiceCategories, packages, gallery, isApproved, isBlocked,
      isAvailable, isOnline, currentLocation, rating, walletBalance
    } = req.body;

    if (!name || !phone) {
      return res.status(400).json({ success: false, message: 'Name and phone are required' });
    }

    const existingDriver = await Driver.findOne({ phone });
    if (existingDriver) {
      return res.status(400).json({ success: false, message: 'Worker with this phone number already exists' });
    }

    const worker = await Driver.create({
      name,
      phone,
      email: email || '',
      profileImage: profileImage || '',
      isWorker: true,
      vehicleType: 'worker',
      vehicleNumber: 'WORKER',
      documentStatus: isApproved ? 'approved' : 'pending',
      isPhoneVerified: true,
      workerServiceCategories: workerServiceCategories || [],
      experience: experience || 0,
      about: about || '',
      basePrice: basePrice || 0,
      packages: packages || [],
      gallery: gallery || [],
      isApproved: isApproved !== undefined ? isApproved : true,
      isBlocked: isBlocked || false,
      isAvailable: isAvailable !== undefined ? isAvailable : true,
      isOnline: isOnline || false,
      currentLocation: currentLocation || { type: 'Point', coordinates: [0, 0] },
      rating: rating || 5.0,
      walletBalance: walletBalance || 0
    });

    res.status(201).json({ success: true, message: 'Worker created successfully', worker });
  } catch (error) {
    next(error);
  }
};

// @desc    Update a worker
// @route   PUT /api/admin/workers/:id
// @access  Private (Admin)
const updateWorker = async (req, res, next) => {
  try {
    const {
      name, phone, email, profileImage, experience, about, basePrice,
      workerServiceCategories, packages, gallery, isApproved, isBlocked,
      isAvailable, isOnline, currentLocation, rating, walletBalance
    } = req.body;

    const worker = await Driver.findOne({ _id: req.params.id, isWorker: true });

    if (!worker) {
      return res.status(404).json({ success: false, message: 'Worker not found' });
    }

    if (phone && phone !== worker.phone) {
      const existingDriver = await Driver.findOne({ phone });
      if (existingDriver) {
        return res.status(400).json({ success: false, message: 'Phone number already in use' });
      }
      worker.phone = phone;
    }

    if (name !== undefined) worker.name = name;
    if (email !== undefined) worker.email = email;
    if (profileImage !== undefined) worker.profileImage = profileImage;
    if (experience !== undefined) worker.experience = experience;
    if (about !== undefined) worker.about = about;
    if (basePrice !== undefined) worker.basePrice = basePrice;
    if (workerServiceCategories !== undefined) worker.workerServiceCategories = workerServiceCategories;
    if (packages !== undefined) worker.packages = packages;
    if (gallery !== undefined) worker.gallery = gallery;
    if (isApproved !== undefined) {
      worker.isApproved = isApproved;
      worker.documentStatus = isApproved ? 'approved' : 'rejected';
    }
    if (isBlocked !== undefined) {
      worker.isBlocked = isBlocked;
      if (isBlocked) worker.isOnline = false;
    }
    if (isAvailable !== undefined) worker.isAvailable = isAvailable;
    if (isOnline !== undefined) worker.isOnline = isOnline;
    if (currentLocation !== undefined) worker.currentLocation = currentLocation;
    if (rating !== undefined) worker.rating = rating;
    if (walletBalance !== undefined) worker.walletBalance = walletBalance;

    await worker.save();
    res.status(200).json({ success: true, message: 'Worker updated successfully', worker });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete a worker
// @route   DELETE /api/admin/workers/:id
// @access  Private (Admin)
const deleteWorker = async (req, res, next) => {
  try {
    const worker = await Driver.findOneAndDelete({ _id: req.params.id, isWorker: true });
    if (!worker) {
      return res.status(404).json({ success: false, message: 'Worker not found' });
    }
    res.status(200).json({ success: true, message: 'Worker deleted successfully' });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  listCategories,
  createCategory,
  updateCategory,
  listWorkers,
  deleteCategory,
  getWorkerById,
  createWorker,
  updateWorker,
  deleteWorker,
};
