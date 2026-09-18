const AIProviderService = require('../src/ai-agent/services/AIProviderService');
const AIWorkspace = require('../src/ai-agent/models/AIWorkspace');
const AIAuditLog = require('../src/ai-agent/models/AIAuditLog');

const configureWorkspaceProvider = async (req, res) => {
    try {
        const { workspaceId } = req.params;
        const { providerType, name, isEnabled, config } = req.body;

        if (!providerType || !name) {
            return res.status(400).json({ success: false, message: 'providerType and name are required' });
        }

        const workspace = await AIWorkspace.findById(workspaceId);
        if (!workspace) {
            return res.status(404).json({ success: false, message: 'Target workspace not found' });
        }

        // Configure the provider. This inherently calls `testConnection` which performs real tests
        // using the backend ENV values (e.g. GEMINI_API_KEY) and updates the status automatically.
        const provider = await AIProviderService.configureProvider(
            workspace._id,
            providerType,
            name,
            isEnabled !== undefined ? isEnabled : true,
            config
        );

        // Explicit Admin Audit Log
        await AIAuditLog.create({
            workspaceId: workspace._id,
            userId: req.admin?._id || req.admin?.id || req.user?._id || req.user?.id,
            action: 'PROVIDER_CONFIGURED',
            status: provider.status === 'CONNECTED' ? 'SUCCESS' : 'INFO',
            details: {
                providerType,
                configuredBy: 'admin',
                status: provider.status,
                error: provider.lastError
            }
        });

        res.status(200).json({
            success: true,
            message: `Successfully configured ${providerType} provider for workspace.`,
            data: provider
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

module.exports = { configureWorkspaceProvider };