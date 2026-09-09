const HermesService = require('../services/HermesService');

const getStatus = async (req, res) => {
    try {
        const status = await HermesService.getStatus(req.workspace._id);
        res.status(200).json({ success: true, data: { status } });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

module.exports = { getStatus };
