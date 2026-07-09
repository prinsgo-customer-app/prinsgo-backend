const FeatureToggle = require('../models/FeatureToggle');

// @desc    List all feature toggles
// @route   GET /api/admin/toggles
// @access  Private (admin)
const listToggles = async (req, res, next) => {
  try {
    const toggles = await FeatureToggle.find().sort({ key: 1 });
    res.status(200).json({ success: true, toggles });
  } catch (error) {
    next(error);
  }
};

// @desc    Create a new feature toggle
// @route   POST /api/admin/toggles
// @access  Private (admin)
const createToggle = async (req, res, next) => {
  try {
    const { key, label, description, isEnabled } = req.body;
    if (!key || !label) {
      return res.status(400).json({ success: false, message: 'key and label are required' });
    }

    const toggle = await FeatureToggle.create({ key, label, description, isEnabled });
    res.status(201).json({ success: true, message: 'Feature toggle created', toggle });
  } catch (error) {
    next(error);
  }
};

// @desc    Flip a feature toggle on/off
// @route   PUT /api/admin/toggles/:key
// @access  Private (admin)
const setToggle = async (req, res, next) => {
  try {
    const { isEnabled } = req.body;
    if (typeof isEnabled !== 'boolean') {
      return res.status(400).json({ success: false, message: 'isEnabled must be true or false' });
    }

    const toggle = await FeatureToggle.findOneAndUpdate(
      { key: req.params.key },
      { isEnabled },
      { new: true }
    );
    if (!toggle) {
      return res.status(404).json({ success: false, message: 'Feature toggle not found' });
    }

    res.status(200).json({ success: true, message: `${toggle.label} is now ${isEnabled ? 'enabled' : 'disabled'}`, toggle });
  } catch (error) {
    next(error);
  }
};

module.exports = { listToggles, createToggle, setToggle };
