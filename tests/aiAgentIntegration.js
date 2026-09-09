const mongoose = require('mongoose');
const AITask = require('../src/ai-agent/models/AITask');
const User = require('../models/User');
const AIWorkspace = require('../src/ai-agent/models/AIWorkspace');
const AIAgent = require('../src/ai-agent/models/AIAgent');
const AIProvider = require('../src/ai-agent/models/AIProvider');
const jwt = require('jsonwebtoken');

require('dotenv').config();

const runTests = async () => {
    let user, workspace, agent, task;
    try {
        const uri = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/prinsgo_test';
        await mongoose.connect(uri);
        console.log("Connected to MongoDB for Tests.");

        user = new User({ name: 'AI Test User', phone: '9999988888', email: 'test@ai.com', role: 'customer' });
        await user.save();

        workspace = new AIWorkspace({ name: 'Test Workspace', owner: user._id });
        await workspace.save();

        agent = new AIAgent({ name: 'Test Agent', provider: 'google', model: 'gemini-1.5-pro', workspaceId: workspace._id });
        await agent.save();

        console.log("✅ Setup Complete");

        console.log("Testing Auth Requirement...");
        const aiAuth = require('../src/ai-agent/middleware/aiAuth');
        const req = { headers: {} };
        const res = { status: (code) => ({ json: (data) => console.log(`[AUTH] Expected 401, got ${code}`) }) };
        await aiAuth.protectAIUser(req, res, () => console.log("Next called"));

        console.log("\n--- Testing Task Service & Fallbacks ---");
        const AITaskService = require('../src/ai-agent/services/AITaskService');

        // Mock fetch globally so we can test the fallback router flow without making real HTTP network calls during the unit tests.
        // The implementation itself now uses real fetches, but tests shouldn't hit OpenAI/Anthropic/Gemini directly.
        const originalFetch = global.fetch;
        global.fetch = async (url) => {
            if (url.includes('/health')) return { ok: true };
            if (url.includes('/v1/chat/completions')) return { ok: true, json: async () => ({ mock: 'hermes_or_openai' }) };
            if (url.includes('generativelanguage')) return { ok: true, json: async () => ({ mock: 'google' }) };
            if (url.includes('api.anthropic.com')) return { ok: true, json: async () => ({ mock: 'anthropic' }) };
            if (url.includes('custom_url')) return { ok: true, json: async () => ({ mock: 'custom' }) };
            return { ok: false };
        };

        // TEST A: Paid provider available
        console.log("TEST A: Paid provider available");
        process.env.GEMINI_API_KEY = "test_key";
        await AIProvider.create({ workspaceId: workspace._id, name: 'Gemini', providerType: 'google', isEnabled: true });
        task = await AITaskService.createTask(workspace._id, user._id, agent._id, "Test A", false, []);
        let executedTask = await AITaskService.executeTask(task._id, user._id);
        console.log(`TEST A Result: ${executedTask.status === 'COMPLETED' ? '✅ COMPLETED' : '❌ Failed'} - Fallback Used: ${executedTask.executionMetadata.routing.fallbackUsed}`);

        // TEST B: Paid provider unavailable -> OpenCode Free attempted
        console.log("\nTEST B: Paid provider unavailable -> OpenCode Free attempted");
        delete process.env.GEMINI_API_KEY;
        // Mock Hermes provider being enabled in the workspace
        await AIProvider.create({ workspaceId: workspace._id, name: 'Hermes', providerType: 'hermes', isEnabled: true });
        process.env.HERMES_BASE_URL = 'http://localhost:9119';

        task = await AITaskService.createTask(workspace._id, user._id, agent._id, "Test B", false, []);
        executedTask = await AITaskService.executeTask(task._id, user._id);
        console.log(`TEST B Result: ${executedTask.status === 'COMPLETED' ? '✅ COMPLETED' : '❌ Failed'} - Fallback Used: ${executedTask.executionMetadata.routing.fallbackUsed} - Provider: ${executedTask.executionMetadata.routing.provider.providerType}`);

        // TEST C: Paid unavailable + OpenCode Free unavailable -> Custom attempted
        console.log("\nTEST C: Paid unavailable + OpenCode Free unavailable -> custom attempted");
        await AIProvider.findOneAndUpdate({ workspaceId: workspace._id, providerType: 'hermes' }, { isEnabled: false });
        await AIProvider.create({ workspaceId: workspace._id, name: 'Local Model', providerType: 'custom', isEnabled: true, config: { baseUrl: 'http://custom_url' } });

        task = await AITaskService.createTask(workspace._id, user._id, agent._id, "Test C", false, []);
        executedTask = await AITaskService.executeTask(task._id, user._id);
        console.log(`TEST C Result: ${executedTask.status === 'COMPLETED' ? '✅ COMPLETED' : '❌ Failed'} - Provider: ${executedTask.executionMetadata.routing.provider.providerType}`);

        // TEST D: All unavailable -> BLOCKED
        console.log("\nTEST D: All unavailable -> BLOCKED");
        await AIProvider.updateMany({ workspaceId: workspace._id }, { isEnabled: false });

        task = await AITaskService.createTask(workspace._id, user._id, agent._id, "Test D", false, []);
        try {
            await AITaskService.executeTask(task._id, user._id);
            console.log("❌ TEST D Failed: Should have thrown an error");
        } catch (e) {
            console.log(`TEST D Result: ✅ Blocked successfully with error: ${e.message}`);
        }

        global.fetch = originalFetch;

    } catch(e) {
        console.error("Test Error", e);
    } finally {
        if(user) await User.deleteMany({ _id: user._id });
        if(workspace) {
            await AIWorkspace.deleteMany({ _id: workspace._id });
            await AIProvider.deleteMany({ workspaceId: workspace._id });
        }
        if(agent) await AIAgent.deleteMany({ _id: agent._id });
        if(task) await AITask.deleteMany({ _id: task._id });
        await mongoose.connection.close();
        console.log("Tests complete.");
    }
};

runTests();
