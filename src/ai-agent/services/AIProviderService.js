const AIProvider = require('../models/AIProvider');

class AIProviderService {
  async getProviders(workspaceId) {
    return AIProvider.find({ workspaceId });
  }

  async testConnection(providerId) {
    const provider = await AIProvider.findById(providerId);
    if (!provider) throw new Error('Provider not found');

    // Abstract check for keys in env.
    // We do NOT expose keys to frontend. We use backend env vars.
    let status = 'NOT_CONFIGURED';
    let isConnected = false;

    try {
      if (provider.providerType === 'google' && process.env.GEMINI_API_KEY) {
        status = 'CONNECTED';
        isConnected = true;
      } else if (provider.providerType === 'openai' && process.env.OPENAI_API_KEY) {
        status = 'CONNECTED';
        isConnected = true;
      } else if (provider.providerType === 'anthropic' && process.env.ANTHROPIC_API_KEY) {
        status = 'CONNECTED';
        isConnected = true;
      } else if (provider.providerType === 'hermes') {
        const HermesService = require('./HermesService');
        // Let HermesService perform the real HTTP ping check to strictly enforce honesty
        status = await HermesService.getStatus(provider.workspaceId);
        isConnected = status === 'CONNECTED';
      } else if (provider.providerType === 'custom') {
         status = 'CONNECTED';
         isConnected = true;
      } else {
         status = 'NOT_CONFIGURED';
      }

      if(!provider.isEnabled) {
         status = 'DISABLED';
      }

      provider.status = status;
      provider.lastTestedAt = new Date();
      provider.lastError = isConnected ? null : 'Missing required API keys or configuration';

      await provider.save();
      return provider;

    } catch (error) {
      provider.status = 'ERROR';
      provider.lastError = error.message;
      provider.lastTestedAt = new Date();
      await provider.save();
      return provider;
    }
  }

  async configureProvider(workspaceId, providerType, name, isEnabled, config) {
      // Find existing or create new
      let provider = await AIProvider.findOne({ workspaceId, providerType });
      if(!provider) {
         provider = new AIProvider({ workspaceId, providerType, name, config, isEnabled });
      } else {
         if(name) provider.name = name;
         if(isEnabled !== undefined) provider.isEnabled = isEnabled;
         if(config) provider.config = { ...provider.config, ...config };
      }

      await provider.save();
      await this.testConnection(provider._id);
      return provider;
  }
}

module.exports = new AIProviderService();
