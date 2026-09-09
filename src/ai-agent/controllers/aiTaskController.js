const AITaskService = require('../services/AITaskService');
const AIApprovalService = require('../services/AIApprovalService');

const createTask = async (req, res) => {
    try {
        const { agentId, instructions, requiresApproval, requiredPermissions } = req.body;
        const task = await AITaskService.createTask(
            req.workspace._id,
            req.user._id,
            agentId,
            instructions,
            requiresApproval,
            requiredPermissions
        );
        res.status(201).json({ success: true, data: task });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

const executeTask = async (req, res) => {
    try {
        const { taskId } = req.params;
        const task = await AITaskService.executeTask(taskId, req.user._id);
        res.status(200).json({ success: true, data: task });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

const resolveApproval = async (req, res) => {
    try {
        const { approvalId } = req.params;
        const { status, reason } = req.body;
        // Requires AI_APPROVAL_APPROVE / REJECT which is checked via route middleware

        const approval = await AIApprovalService.resolveApproval(approvalId, req.user._id, status, reason);
        res.status(200).json({ success: true, data: approval });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

module.exports = {
    createTask,
    executeTask,
    resolveApproval
};
