const FeatureToggle = require('../models/FeatureToggle');

const checkServiceToggle = (toggleKey) => {
  return async (req, res, next) => {
    try {
      const toggle = await FeatureToggle.findOne({ key: toggleKey });

      if (!toggle || !toggle.isEnabled) {
        return res.status(403).json({
          success: false,
          message: `The requested service (${toggleKey}) is currently disabled by the administrator.`,
        });
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

module.exports = {
  checkServiceToggle,
};
