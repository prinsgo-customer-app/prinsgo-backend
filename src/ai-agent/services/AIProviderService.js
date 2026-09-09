const AIProvider = require('../models/AIProvider');

class AIProviderService {
  async getProviders(workspaceId) {
    return AIProvider.find({ workspaceId });
  }

  async testConnection(providerId) {
    const provider = await AIProvider.findById(providerId);
    if (!provider) throw new Error('Provider not found');

    // Real API Validation Instead of Fake Stubbing
    // We do NOT expose keys to frontend. We use backend env vars.
    let status = 'NOT_CONFIGURED';
    let isConnected = false;

    try {
      if (provider.providerType === 'google') {
          if (!process.env.GEMINI_API_KEY) {
              status = 'NOT_CONFIGURED';
          } else {
              const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${process.env.GEMINI_API_KEY}`);
              isConnected = res.ok;
              status = isConnected ? 'CONNECTED' : 'ERROR';
          }
      } else if (provider.providerType === 'openai') {
          if (!process.env.OPENAI_API_KEY) {
              status = 'NOT_CONFIGURED';
          } else {
              const res = await fetch(`https://api.openai.com/v1/models`, {
                  headers: { 'Authorization': `Bearer ${process.env.OPENAI_API_KEY}` }
              });
              isConnected = res.ok;
              status = isConnected ? 'CONNECTED' : 'ERROR';
          }
      } else if (provider.providerType === 'anthropic') {
          if (!process.env.ANTHROPIC_API_KEY) {
              status = 'NOT_CONFIGURED';
          } else {
              // Anthropic doesn't have a simple models endpoint that doesn't cost tokens for a simple ping,
              // but we can simulate a ping by creating a tiny invalid request and expecting a specific 400 error rather than 401 Unauthorized
              const res = await fetch(`https://api.anthropic.com/v1/messages`, {
                  method: 'POST',
                  headers: {
                      'x-api-key': process.env.ANTHROPIC_API_KEY,
                      'anthropic-version': '2023-06-01',
                      'content-type': 'application/json'
                  },
                  body: JSON.stringify({ max_tokens: 1, messages: [] })
              });
              // 400 Bad Request means key is valid but request is bad. 401 means invalid key.
              isConnected = res.status !== 401 && res.status !== 403;
              status = isConnected ? 'CONNECTED' : 'ERROR';
          }
      } else if (provider.providerType === 'hermes') {
        const HermesService = require('./HermesService');
        // Let HermesService perform the real HTTP ping check to strictly enforce honesty
        status = await HermesService.getStatus(provider.workspaceId);
        isConnected = status === 'CONNECTED';
      } else if (provider.providerType === 'custom') {
          if (!provider.config || !provider.config.baseUrl) {
              status = 'NOT_CONFIGURED';
          } else {
              try {
                  const res = await fetch(provider.config.baseUrl);
                  isConnected = res.ok;
                  status = isConnected ? 'CONNECTED' : 'ERROR';
              } catch(e) {
                  status = 'ERROR';
                  isConnected = false;
              }
          }
      } else {
         status = 'NOT_CONFIGURED';
      }

      if(!provider.isEnabled) {
         status = 'DISABLED';
      }

      provider.status = status;
      provider.lastTestedAt = new Date();
      provider.lastError = isConnected ? null : 'Missing required API keys, unreachable URL, or invalid configuration';

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
