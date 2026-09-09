const AIAutomation = require('../models/AIAutomation');

const getAutomations = async (req, res) => {
    try {
        const automations = await AIAutomation.find({ workspaceId: req.workspace._id });
        res.status(200).json({ success: true, data: automations });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

const createAutomation = async (req, res) => {
    try {
        const { name, description, triggerType, triggerConfig, agentId, instructions, status, metadata } = req.body;
        const automation = new AIAutomation({
            workspaceId: req.workspace._id,
            name,
            description,
            triggerType,
            triggerConfig,
            agentId,
            instructions,
            status,
            metadata
        });
        await automation.save();
        res.status(201).json({ success: true, data: automation });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

module.exports = { getAutomations, createAutomation };
