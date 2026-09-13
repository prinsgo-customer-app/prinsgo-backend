const AITaskService = require('../services/AITaskService');
const AIApprovalService = require('../services/AIApprovalService');

const getTasks = async (req, res) => {
    try {
        const page = parseInt(req.query.page, 10) || 1;
        const limit = parseInt(req.query.limit, 10) || 10;
        const result = await AITaskService.getTasks(req.workspace._id, page, limit);
        res.status(200).json({ success: true, data: result.tasks, pagination: { total: result.total, page: result.page, pages: result.pages } });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

const getTaskDetails = async (req, res) => {
    try {
        const { taskId } = req.params;
        const task = await AITaskService.getTaskDetails(taskId, req.workspace._id);
        res.status(200).json({ success: true, data: task });
    } catch (error) {
        res.status(404).json({ success: false, message: error.message });
    }
};

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

const getApprovals = async (req, res) => {
    try {
        const page = parseInt(req.query.page, 10) || 1;
        const limit = parseInt(req.query.limit, 10) || 10;
        const status = req.query.status;
        const result = await AIApprovalService.getApprovals(req.workspace._id, page, limit, status);
        res.status(200).json({ success: true, data: result.approvals, pagination: { total: result.total, page: result.page, pages: result.pages } });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

const getApprovalDetails = async (req, res) => {
    try {
        const { approvalId } = req.params;
        const approval = await AIApprovalService.getApprovalDetails(approvalId, req.workspace._id);
        res.status(200).json({ success: true, data: approval });
    } catch (error) {
        res.status(404).json({ success: false, message: error.message });
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
    getTasks,
    getTaskDetails,
    createTask,
    executeTask,
    getApprovals,
    getApprovalDetails,
    resolveApproval
};
