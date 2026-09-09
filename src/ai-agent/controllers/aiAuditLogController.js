const AIAuditLog = require('../models/AIAuditLog');

const getAuditLogs = async (req, res) => {
    try {
        const logs = await AIAuditLog.find({ workspaceId: req.workspace._id }).sort({ createdAt: -1 });
        res.status(200).json({ success: true, data: logs });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

module.exports = { getAuditLogs };
