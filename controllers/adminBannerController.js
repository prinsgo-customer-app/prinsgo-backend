const Banner = require('../models/Banner');

// @desc    List all banners (admin view, includes inactive)
// @route   GET /api/admin/banners
// @access  Private (admin)
const listBanners = async (req, res, next) => {
  try {
    const banners = await Banner.find().sort({ order: 1, createdAt: -1 }).lean();
    res.status(200).json({ success: true, banners });
  } catch (error) {
    next(error);
  }
};

// @desc    Create a new banner
// @route   POST /api/admin/banners
// @access  Private (admin)
const createBanner = async (req, res, next) => {
  try {
    const { title, imageUrl, linkType, linkValue, order, isActive } = req.body;
    if (!title || !imageUrl) {
      return res.status(400).json({ success: false, message: 'title and imageUrl are required' });
    }

    const created = await Banner.create({
      title,
      imageUrl,
      linkType: linkType || 'none',
      linkValue: linkValue || '',
      order: order !== undefined ? order : 0,
      isActive: isActive !== undefined ? isActive : true,
    });

    const banner = await Banner.findById(created._id).lean();
    res.status(201).json({ success: true, message: 'Banner created', banner: banner || created });
  } catch (error) {
    next(error);
  }
};

// @desc    Update a banner
// @route   PUT /api/admin/banners/:id
// @access  Private (admin)
const updateBanner = async (req, res, next) => {
  try {
    const banner = await Banner.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!banner) {
      return res.status(404).json({ success: false, message: 'Banner not found' });
    }

    const persistedBanner = await Banner.findById(banner._id).lean();

    res.status(200).json({ success: true, message: 'Banner updated', banner: persistedBanner || banner });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete a banner
// @route   DELETE /api/admin/banners/:id
// @access  Private (admin)
const deleteBanner = async (req, res, next) => {
  try {
    const banner = await Banner.findByIdAndDelete(req.params.id);
    if (!banner) {
      return res.status(404).json({ success: false, message: 'Banner not found' });
    }
    res.status(200).json({ success: true, message: 'Banner deleted' });
  } catch (error) {
    next(error);
  }
};

module.exports = { listBanners, createBanner, updateBanner, deleteBanner };
