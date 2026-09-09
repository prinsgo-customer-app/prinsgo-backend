const AIFile = require('../models/AIFile');

const getFiles = async (req, res) => {
    try {
        const files = await AIFile.find({ workspaceId: req.workspace._id });
        res.status(200).json({ success: true, data: files });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

const createFileRecord = async (req, res) => {
    // Note: Actual file upload might be done via middleware (e.g. multer), this is a stub for the metadata record
    try {
        const { filename, fileType, size, url, purpose, metadata } = req.body;
        const file = new AIFile({
            workspaceId: req.workspace._id,
            uploadedById: req.user._id,
            filename,
            fileType,
            size,
            url,
            purpose,
            metadata
        });
        await file.save();
        res.status(201).json({ success: true, data: file });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

module.exports = { getFiles, createFileRecord };
