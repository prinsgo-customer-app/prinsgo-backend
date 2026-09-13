const AITaskService = require('../services/AITaskService');
const AIApprovalService = require('../services/AIApprovalService');

const mongoose = require('mongoose');

const getTasks = async (req, res) => {
    try {
        const page = Math.max(1, parseInt(req.query.page, 10) || 1);
        const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 10));
        const result = await AITaskService.getTasks(req.workspace._id, page, limit);
        res.status(200).json({ success: true, data: result.tasks, pagination: { total: result.total, page: result.page, pages: result.pages } });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

const getTaskDetails = async (req, res) => {
    try {
        const { taskId } = req.params;
        if (!mongoose.Types.ObjectId.isValid(taskId)) {
            return res.status(400).json({ success: false, message: 'Invalid task ID' });
        }
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
        if (!mongoose.Types.ObjectId.isValid(taskId)) {
            return res.status(400).json({ success: false, message: 'Invalid task ID' });
        }
        const task = await AITaskService.executeTask(taskId, req.user._id);
        res.status(200).json({ success: true, data: task });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

const getApprovals = async (req, res) => {
    try {
        const page = Math.max(1, parseInt(req.query.page, 10) || 1);
        const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 10));
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
        if (!mongoose.Types.ObjectId.isValid(approvalId)) {
            return res.status(400).json({ success: false, message: 'Invalid approval ID' });
        }
        const approval = await AIApprovalService.getApprovalDetails(approvalId, req.workspace._id);
        res.status(200).json({ success: true, data: approval });
    } catch (error) {
        res.status(404).json({ success: false, message: error.message });
    }
};

const resolveApproval = async (req, res) => {
    try {
        const { approvalId } = req.params;
        if (!mongoose.Types.ObjectId.isValid(approvalId)) {
            return res.status(400).json({ success: false, message: 'Invalid approval ID' });
        }
        const { status, reason } = req.body;

        // Dynamically enforce RBAC based on requested action
        const adminPermissions = [
            'AI_AGENT_VIEW', 'AI_AGENT_CREATE', 'AI_AGENT_UPDATE', 'AI_AGENT_DELETE',
            'AI_TASK_CREATE', 'AI_TASK_EXECUTE', 'AI_TASK_CANCEL', 'AI_TASK_VIEW',
            'AI_APPROVAL_VIEW', 'AI_APPROVAL_APPROVE', 'AI_APPROVAL_REJECT',
            'AI_MEMORY_VIEW', 'AI_MEMORY_MANAGE', 'AI_REPOSITORY_VIEW', 'AI_REPOSITORY_MANAGE',
            'AI_CODE_ANALYSIS', 'AI_CODE_MODIFICATION', 'AI_GITHUB_READ', 'AI_GITHUB_WRITE',
            'AI_AUTOMATION_MANAGE', 'AI_PROVIDER_MANAGE', 'AI_INTEGRATION_MANAGE'
        ];

        const customerPermissions = [
            'AI_AGENT_VIEW', 'AI_TASK_CREATE', 'AI_TASK_EXECUTE', 'AI_TASK_VIEW',
            'AI_APPROVAL_VIEW', 'AI_APPROVAL_APPROVE', 'AI_APPROVAL_REJECT',
            'AI_MEMORY_VIEW', 'AI_MEMORY_MANAGE'
        ];

        let userPermissions = [];
        if (req.user.role === 'admin' || req.user.role === 'superadmin' || req.user.role === 'manager') {
            userPermissions = adminPermissions;
        } else {
            userPermissions = customerPermissions;
        }

        // Explicitly check for valid actions
        if (status !== 'APPROVED' && status !== 'REJECTED') {
            return res.status(400).json({ success: false, message: 'Invalid status. Must be APPROVED or REJECTED.' });
        }

        if (status === 'APPROVED' && !userPermissions.includes('AI_APPROVAL_APPROVE')) {
            return res.status(403).json({ success: false, message: 'Missing required permission: AI_APPROVAL_APPROVE' });
        }

        if (status === 'REJECTED' && !userPermissions.includes('AI_APPROVAL_REJECT')) {
            return res.status(403).json({ success: false, message: 'Missing required permission: AI_APPROVAL_REJECT' });
        }

        const approval = await AIApprovalService.resolveApproval(approvalId, req.workspace._id, req.user._id, status, reason);
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
