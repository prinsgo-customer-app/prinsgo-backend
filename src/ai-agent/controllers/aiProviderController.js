const AIProviderService = require('../services/AIProviderService');

const getProviders = async (req, res) => {
    try {
        const providers = await AIProviderService.getProviders(req.workspace._id);
        res.status(200).json({ success: true, data: providers });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

const configureProvider = async (req, res) => {
    try {
        const { providerType, name, isEnabled, config } = req.body;
        const provider = await AIProviderService.configureProvider(
            req.workspace._id,
            providerType,
            name,
            isEnabled,
            config
        );
        res.status(200).json({ success: true, data: provider });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

const testConnection = async (req, res) => {
    try {
        const { providerId } = req.params;
        const provider = await AIProviderService.testConnection(providerId);
        res.status(200).json({ success: true, data: provider });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

module.exports = { getProviders, configureProvider, testConnection };
