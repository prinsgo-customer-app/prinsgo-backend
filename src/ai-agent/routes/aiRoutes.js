const express = require('express');
const router = express.Router();

const { protectAIUser, requireWorkspaceAccess, requireAIPermission } = require('../middleware/aiAuth');
const aiAgentController = require('../controllers/aiAgentController');
const aiTaskController = require('../controllers/aiTaskController');
const aiSystemController = require('../controllers/aiSystemController');

// All AI routes require authentication
router.use(protectAIUser);

// Workspace Management (doesn't require a specific workspace in URL)
router.post('/workspaces', aiSystemController.createWorkspace);

// System Status
router.get('/workspaces/:workspaceId/status', requireWorkspaceAccess, aiSystemController.getSystemStatus);

// Agents
router.post('/workspaces/:workspaceId/agents',
    requireWorkspaceAccess,
    requireAIPermission('AI_AGENT_CREATE'),
    aiAgentController.createAgent
);
router.get('/workspaces/:workspaceId/agents',
    requireWorkspaceAccess,
    requireAIPermission('AI_AGENT_VIEW'),
    aiAgentController.getAgents
);
router.patch('/workspaces/:workspaceId/agents/:agentId/toggle',
    requireWorkspaceAccess,
    requireAIPermission('AI_AGENT_UPDATE'),
    aiAgentController.toggleAgent
);

// Tasks
router.post('/workspaces/:workspaceId/tasks',
    requireWorkspaceAccess,
    requireAIPermission('AI_TASK_CREATE'),
    aiTaskController.createTask
);
router.post('/workspaces/:workspaceId/tasks/:taskId/execute',
    requireWorkspaceAccess,
    requireAIPermission('AI_TASK_EXECUTE'),
    aiTaskController.executeTask
);

// Approvals
router.post('/workspaces/:workspaceId/approvals/:approvalId/resolve',
    requireWorkspaceAccess,
    requireAIPermission('AI_APPROVAL_APPROVE'), // Simplified, ideally checks both APPROVE and REJECT based on body
    aiTaskController.resolveApproval
);

const aiProviderController = require('../controllers/aiProviderController');
const aiMemoryController = require('../controllers/aiMemoryController');
const aiGitHubController = require('../controllers/aiGitHubController');
const aiAuditLogController = require('../controllers/aiAuditLogController');
const aiHermesController = require('../controllers/aiHermesController');
const aiFileController = require('../controllers/aiFileController');
const aiAutomationController = require('../controllers/aiAutomationController');

// Providers
router.get('/workspaces/:workspaceId/providers', requireWorkspaceAccess, requireAIPermission('AI_PROVIDER_MANAGE'), aiProviderController.getProviders);
router.post('/workspaces/:workspaceId/providers/configure', requireWorkspaceAccess, requireAIPermission('AI_PROVIDER_MANAGE'), aiProviderController.configureProvider);
router.post('/workspaces/:workspaceId/providers/:providerId/test', requireWorkspaceAccess, requireAIPermission('AI_PROVIDER_MANAGE'), aiProviderController.testConnection);

// Memory
router.post('/workspaces/:workspaceId/memory', requireWorkspaceAccess, requireAIPermission('AI_MEMORY_MANAGE'), aiMemoryController.createMemory);
router.get('/workspaces/:workspaceId/memory', requireWorkspaceAccess, requireAIPermission('AI_MEMORY_VIEW'), aiMemoryController.searchMemory);
router.delete('/workspaces/:workspaceId/memory/:memoryId', requireWorkspaceAccess, requireAIPermission('AI_MEMORY_MANAGE'), aiMemoryController.deleteMemory);

// GitHub / Repositories
router.get('/workspaces/:workspaceId/github/status', requireWorkspaceAccess, requireAIPermission('AI_GITHUB_READ'), aiGitHubController.getStatus);
router.post('/workspaces/:workspaceId/github/test', requireWorkspaceAccess, requireAIPermission('AI_INTEGRATION_MANAGE'), aiGitHubController.testConnection);
router.post('/workspaces/:workspaceId/github/authorize', requireWorkspaceAccess, requireAIPermission('AI_REPOSITORY_MANAGE'), aiGitHubController.authorizeRepository);

// Hermes
router.get('/workspaces/:workspaceId/hermes/status', requireWorkspaceAccess, requireAIPermission('AI_AGENT_VIEW'), aiHermesController.getStatus);

// Audit Logs
router.get('/workspaces/:workspaceId/audit-logs', requireWorkspaceAccess, requireAIPermission('AI_AGENT_VIEW'), aiAuditLogController.getAuditLogs);

// Automations
router.get('/workspaces/:workspaceId/automations', requireWorkspaceAccess, requireAIPermission('AI_AUTOMATION_MANAGE'), aiAutomationController.getAutomations);
router.post('/workspaces/:workspaceId/automations', requireWorkspaceAccess, requireAIPermission('AI_AUTOMATION_MANAGE'), aiAutomationController.createAutomation);

// Files
router.get('/workspaces/:workspaceId/files', requireWorkspaceAccess, requireAIPermission('AI_AGENT_VIEW'), aiFileController.getFiles);
router.post('/workspaces/:workspaceId/files', requireWorkspaceAccess, requireAIPermission('AI_TASK_CREATE'), aiFileController.createFileRecord);

module.exports = router;
