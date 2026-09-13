const AIProviderService = require('../services/AIProviderService');
const HermesService = require('../services/HermesService');
const AIGitHubService = require('../services/AIGitHubService');
const AIWorkspaceService = require('../services/AIWorkspaceService');

const getSystemStatus = async (req, res) => {
    try {
        const workspaceId = req.workspace._id;

        // We evaluate status without throwing errors for the summary
        const providers = await AIProviderService.getProviders(workspaceId);
        const hermesStatus = await HermesService.getStatus(workspaceId);
        const githubStatus = await AIGitHubService.getStatus(workspaceId);

        // Files status: evaluate based on actual environment configuration for Cloudinary/Storage
        const hasFileStorage = !!(process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET);
        const filesStatus = hasFileStorage ? 'AVAILABLE' : 'NOT_CONFIGURED';

        // Memory status: since memory is stored in MongoDB, if we are successfully processing this request, MongoDB is connected.
        // We use AVAILABLE to denote a locally working service rather than READY for an external one.
        const memoryStatus = 'AVAILABLE';

        res.status(200).json({
            success: true,
            data: {
                aiAgentBackend: 'READY',
                providers: providers.map(p => ({ type: p.providerType, status: p.status })),
                hermes: hermesStatus,
                github: githubStatus,
                googleDrive: 'NOT_CONFIGURED',
                files: filesStatus,
                memory: memoryStatus
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

const createWorkspace = async (req, res) => {
    try {
        const { name, description } = req.body;
        const workspace = await AIWorkspaceService.createWorkspace(req.user._id, name, description);
        res.status(201).json({ success: true, data: workspace });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

const getCurrentWorkspace = async (req, res) => {
    try {
        const workspace = await AIWorkspaceService.getCurrentWorkspace(req.user._id);
        res.status(200).json({ success: true, data: workspace });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

const getWorkspaces = async (req, res) => {
    try {
        const workspaces = await AIWorkspaceService.getUserWorkspaces(req.user._id);
        res.status(200).json({ success: true, data: workspaces });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

module.exports = {
    getSystemStatus,
    createWorkspace,
    getCurrentWorkspace,
    getWorkspaces
};
