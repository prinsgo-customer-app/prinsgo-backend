const AIAgent = require('../models/AIAgent');

const createAgent = async (req, res) => {
    try {
        const workspaceId = req.workspace._id;
        const { name, description, systemInstructions, provider, model, tools, permissions, memorySettings, executionLimits, approvalRequirements } = req.body;

        const agent = new AIAgent({
            workspaceId,
            name,
            description,
            systemInstructions,
            provider,
            model,
            tools,
            permissions,
            memorySettings,
            executionLimits,
            approvalRequirements
        });

        await agent.save();
        res.status(201).json({ success: true, data: agent });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

const getAgents = async (req, res) => {
    try {
        const agents = await AIAgent.find({ workspaceId: req.workspace._id });
        res.status(200).json({ success: true, data: agents });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

const toggleAgent = async (req, res) => {
    try {
        const { agentId } = req.params;
        const { isEnabled } = req.body;

        const agent = await AIAgent.findOneAndUpdate(
            { _id: agentId, workspaceId: req.workspace._id },
            { isEnabled },
            { new: true }
        );

        if(!agent) return res.status(404).json({ success: false, message: 'Agent not found' });
        res.status(200).json({ success: true, data: agent });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

module.exports = {
    createAgent,
    getAgents,
    toggleAgent
};
