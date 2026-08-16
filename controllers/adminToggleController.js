const FeatureToggle = require('../models/FeatureToggle');

// @desc    List all feature toggles
// @route   GET /api/admin/toggles
// @access  Private (admin)
const listToggles = async (req, res, next) => {
  try {
    const toggles = await FeatureToggle.find().sort({ key: 1 }).lean();
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

    const existing = await FeatureToggle.findOne({ key });
    if (existing) {
      return res.status(400).json({ success: false, message: 'Feature toggle with this key already exists' });
    }

    const created = await FeatureToggle.create({ key, label, description, isEnabled });
    const toggle = await FeatureToggle.findById(created._id).lean();

    res.status(201).json({ success: true, message: 'Feature toggle created', toggle: toggle || created });
  } catch (error) {
    next(error);
  }
};

// @desc    Flip a feature toggle on/off or update description/label
// @route   PUT /api/admin/toggles/:key
// @access  Private (admin)
const setToggle = async (req, res, next) => {
  try {
    const updateFields = {};
    if (req.body.isEnabled !== undefined) updateFields.isEnabled = Boolean(req.body.isEnabled);
    if (req.body.label !== undefined) updateFields.label = req.body.label;
    if (req.body.description !== undefined) updateFields.description = req.body.description;

    if (Object.keys(updateFields).length === 0) {
      return res.status(400).json({ success: false, message: 'No valid update fields provided' });
    }

    const toggle = await FeatureToggle.findOneAndUpdate(
      { key: req.params.key },
      { $set: updateFields },
      { new: true, runValidators: true }
    );

    if (!toggle) {
      return res.status(404).json({ success: false, message: 'Feature toggle not found' });
    }

    const persisted = await FeatureToggle.findById(toggle._id).lean();

    res.status(200).json({
      success: true,
      message: `${persisted ? persisted.label : toggle.label} is now ${(persisted ? persisted.isEnabled : toggle.isEnabled) ? 'enabled' : 'disabled'}`,
      toggle: persisted || toggle,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete a feature toggle
// @route   DELETE /api/admin/toggles/:key
// @access  Private (admin)
const deleteToggle = async (req, res, next) => {
  try {
    const toggle = await FeatureToggle.findOneAndDelete({ key: req.params.key });
    if (!toggle) {
      return res.status(404).json({ success: false, message: 'Feature toggle not found' });
    }
    res.status(200).json({ success: true, message: 'Feature toggle deleted successfully' });
  } catch (error) {
    next(error);
  }
};

module.exports = { listToggles, createToggle, setToggle, deleteToggle };
