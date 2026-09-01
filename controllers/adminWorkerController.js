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

module.exports = {
  listCategories,
  createCategory,
  updateCategory,
  listWorkers,
};
