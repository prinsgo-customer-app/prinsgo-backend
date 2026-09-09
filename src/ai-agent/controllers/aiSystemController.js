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

        res.status(200).json({
            success: true,
            data: {
                aiAgentBackend: 'READY',
                providers: providers.map(p => ({ type: p.providerType, status: p.status })),
                hermes: hermesStatus,
                github: githubStatus,
                googleDrive: 'NOT_CONFIGURED' // stub
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

module.exports = {
    getSystemStatus,
    createWorkspace
};
