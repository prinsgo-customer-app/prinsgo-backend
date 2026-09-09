const mongoose = require('mongoose');
const AITask = require('../src/ai-agent/models/AITask');
const User = require('../models/User');
const AIWorkspace = require('../src/ai-agent/models/AIWorkspace');
const AIAgent = require('../src/ai-agent/models/AIAgent');
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

        console.log("Testing Task Service...");
        const AITaskService = require('../src/ai-agent/services/AITaskService');
        task = await AITaskService.createTask(workspace._id, user._id, agent._id, "Test instructions", false, []);
        console.log(`Task Created: ${task.status === 'QUEUED' ? '✅ QUEUED' : '❌ Failed'}`);

        const executedTask = await AITaskService.executeTask(task._id, user._id);
        console.log(`Task Executed: ${executedTask.status === 'RUNNING' ? '✅ RUNNING' : '❌ Failed'}`);
    } catch(e) {
        console.error("Test Error", e);
    } finally {
        if(user) await User.deleteMany({ _id: user._id });
        if(workspace) await AIWorkspace.deleteMany({ _id: workspace._id });
        if(agent) await AIAgent.deleteMany({ _id: agent._id });
        if(task) await AITask.deleteMany({ _id: task._id });
        await mongoose.connection.close();
        console.log("Tests complete.");
    }
};

runTests();
