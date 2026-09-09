const AIProvider = require('../models/AIProvider');
const HermesService = require('./HermesService');

class AIProviderRouterService {
    /**
     * Resolves the best available provider based on the fallback rules:
     * 1. Configured Paid Provider
     * 2. OpenCode Free / Keyless Hermes provider
     * 3. Other legitimately available free/OAuth provider
     * 4. Local/self-hosted model
     * 5. BLOCKED
     */
    async selectProvider(workspaceId) {
        // Fetch all enabled providers for this workspace
        const providers = await AIProvider.find({ workspaceId, isEnabled: true });

        let attempts = [];
        let fallbackUsed = false;

        // Helper to check standard Paid Providers (OpenAI, Gemini, Anthropic)
        const checkPaid = (type, keyName) => {
            const p = providers.find(prov => prov.providerType === type);
            if (p && p.status === 'CONNECTED' && process.env[keyName]) {
                // To guarantee it's actually working, we assume testConnection has validated it or we do a quick validation here.
                // For simplicity, presence of valid ENV is standard for the basic integrations here unless tested via real HTTP ping.
                return p;
            }
            attempts.push(`Paid: ${type} missing/unavailable`);
            return null;
        };

        // 1. Try Configured Paid Providers
        let selectedProvider = checkPaid('openai', 'OPENAI_API_KEY') ||
                               checkPaid('google', 'GEMINI_API_KEY') ||
                               checkPaid('anthropic', 'ANTHROPIC_API_KEY');

        if (selectedProvider) {
            return {
                provider: selectedProvider,
                status: 'CONNECTED',
                reason: 'Paid provider preferred',
                attempts,
                fallbackUsed: false
            };
        }

        fallbackUsed = true;

        // 2. Try Hermes (OpenCode Free / Keyless)
        // Hermes acts as a gateway that natively supports keyless opencode-free routing.
        const hermesProvider = providers.find(prov => prov.providerType === 'hermes');
        if (hermesProvider) {
            // Ensure config sets the model correctly for OpenCode free fallback
            if (!hermesProvider.config) hermesProvider.config = {};
            if (!hermesProvider.config.model) hermesProvider.config.model = 'opencode-free';
        }
        if (hermesProvider) {
            // Must verify ACTUAL Hermes runtime health
            const hermesStatus = await HermesService.getStatus(workspaceId);
            if (hermesStatus === 'CONNECTED') {
                return {
                    provider: hermesProvider,
                    status: 'CONNECTED',
                    reason: 'Fallback to Hermes (OpenCode Free)',
                    attempts,
                    fallbackUsed
                };
            } else {
                attempts.push(`Hermes: Status is ${hermesStatus}`);
            }
        } else {
            attempts.push(`Hermes: Not configured in workspace`);
        }

        // 3. Other free/OAuth providers / 4. Local/Self-hosted (Custom)
        const customProvider = providers.find(prov => prov.providerType === 'custom');
        if (customProvider) {
            return {
                provider: customProvider,
                status: 'CONNECTED',
                reason: 'Fallback to Custom/Local endpoint',
                attempts,
                fallbackUsed
            };
        } else {
            attempts.push(`Custom: Not configured in workspace`);
        }

        // 5. Nothing available
        return {
            provider: null,
            status: 'BLOCKED',
            reason: 'NO_USABLE_AI_PROVIDER',
            attempts,
            fallbackUsed
        };
    }
}

module.exports = new AIProviderRouterService();
