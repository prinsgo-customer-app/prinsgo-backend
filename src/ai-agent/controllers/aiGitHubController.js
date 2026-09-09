const AIGitHubService = require('../services/AIGitHubService');

const getStatus = async (req, res) => {
    try {
        const status = await AIGitHubService.getStatus(req.workspace._id);
        res.status(200).json({ success: true, data: { status } });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

const testConnection = async (req, res) => {
    try {
        const integration = await AIGitHubService.testConnection(req.workspace._id);
        res.status(200).json({ success: true, data: integration });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

const authorizeRepository = async (req, res) => {
    try {
        const { repoOwner, repoName, permissions } = req.body;
        const repo = await AIGitHubService.authorizeRepository(req.workspace._id, repoOwner, repoName, permissions);
        res.status(201).json({ success: true, data: repo });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

module.exports = { getStatus, testConnection, authorizeRepository };
