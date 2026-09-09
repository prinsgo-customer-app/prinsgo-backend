const AITask = require('../models/AITask');
const AIAgent = require('../models/AIAgent');
const AIApprovalService = require('./AIApprovalService');
const AIAuditLog = require('../models/AIAuditLog');
const AIProviderRouterService = require('./AIProviderRouterService');

class AITaskService {
  async createTask(workspaceId, creatorId, agentId, instructions, requiresApproval, requiredPermissions) {
      const agent = await AIAgent.findOne({ _id: agentId, workspaceId });
      if(!agent) throw new Error("Agent not found or does not belong to this workspace");
      if(!agent.isEnabled) throw new Error("Agent is disabled");

      const task = new AITask({
          workspaceId,
          creatorId,
          agentId,
          instructions,
          status: requiresApproval ? 'WAITING_FOR_APPROVAL' : 'QUEUED',
          requiresApproval,
          requiredPermissions
      });

      await task.save();

      if(requiresApproval) {
          const approval = await AIApprovalService.createApproval(
              workspaceId,
              task._id,
              creatorId,
              'TASK_EXECUTION',
              `Agent: ${agent.name}`
          );
          task.approvalId = approval._id;
          await task.save();
      }

      await AIAuditLog.create({
          workspaceId,
          userId: creatorId,
          action: 'TASK_CREATED',
          taskId: task._id,
          status: 'INFO',
          details: { agentId, requiresApproval }
      });

      return task;
  }

  async executeTask(taskId, executedById) {
      const task = await AITask.findById(taskId);
      if(!task) throw new Error("Task not found");

      if(task.status === 'WAITING_FOR_APPROVAL') {
          throw new Error("Task requires approval before execution");
      }

      if(task.status !== 'QUEUED') {
          throw new Error(`Task cannot be executed from status: ${task.status}`);
      }

      task.status = 'RUNNING';
      await task.save();

      await AIAuditLog.create({
          workspaceId: task.workspaceId,
          userId: executedById,
          action: 'TASK_STARTED',
          taskId: task._id,
          status: 'INFO'
      });

      const agent = await AIAgent.findById(task.agentId);

      // Provider Fallback Selection
      const routingResult = await AIProviderRouterService.selectProvider(task.workspaceId);

      // Update execution metadata with routing decisions
      task.executionMetadata = {
          ...task.executionMetadata,
          routing: routingResult
      };

      if (routingResult.status === 'BLOCKED') {
          task.status = 'BLOCKED';
          task.error = { message: routingResult.reason, details: routingResult.attempts };
          await task.save();

          await AIAuditLog.create({
              workspaceId: task.workspaceId,
              userId: executedById,
              action: 'TASK_FAILED',
              taskId: task._id,
              status: 'FAILURE',
              details: { reason: routingResult.reason, fallbackUsed: routingResult.fallbackUsed }
          });

          throw new Error(routingResult.reason);
      }

      await task.save();

      // Delegation to execution engine based on provider (or routed fallback provider)
      const executionProviderType = routingResult.provider.providerType;

      if (executionProviderType === 'hermes') {
          const HermesService = require('./HermesService'); // Lazy load to avoid circular deps
          return await HermesService.executeTask(task._id);
      }

      // PAID PROVIDER OR CUSTOM LOCAL EXECUTION
      // No Fake Completions! We perform a real fetch to the provider's standard endpoint or Custom BaseUrl.
      try {
          let response;
          let data;

          if (executionProviderType === 'openai') {
             response = await fetch(`https://api.openai.com/v1/chat/completions`, {
                 method: 'POST',
                 headers: {
                     'Content-Type': 'application/json',
                     'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
                 },
                 body: JSON.stringify({
                     model: agent.model || 'gpt-3.5-turbo',
                     messages: [{ role: 'user', content: task.instructions }]
                 })
             });
          } else if (executionProviderType === 'anthropic') {
             response = await fetch(`https://api.anthropic.com/v1/messages`, {
                 method: 'POST',
                 headers: {
                     'Content-Type': 'application/json',
                     'x-api-key': process.env.ANTHROPIC_API_KEY,
                     'anthropic-version': '2023-06-01'
                 },
                 body: JSON.stringify({
                     model: agent.model || 'claude-3-haiku-20240307',
                     max_tokens: 1024,
                     messages: [{ role: 'user', content: task.instructions }]
                 })
             });
          } else if (executionProviderType === 'google') {
             response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${agent.model || 'gemini-1.5-pro'}:generateContent?key=${process.env.GEMINI_API_KEY}`, {
                 method: 'POST',
                 headers: { 'Content-Type': 'application/json' },
                 body: JSON.stringify({
                     contents: [{ parts: [{ text: task.instructions }] }]
                 })
             });
          } else if (executionProviderType === 'custom') {
             const baseUrl = routingResult.provider.config.baseUrl;
             response = await fetch(baseUrl, {
                 method: 'POST',
                 headers: { 'Content-Type': 'application/json' },
                 body: JSON.stringify({
                     model: agent.model || 'local-model',
                     messages: [{ role: 'user', content: task.instructions }]
                 }) // OpenAI-compatible payload for local models
             });
          }

          if (!response || !response.ok) {
              throw new Error(`${executionProviderType} returned status ${response ? response.status : 'unknown'}: ${response ? await response.text() : 'No response'}`);
          }

          data = await response.json();

          task.status = 'COMPLETED';
          task.result = data;
          await task.save();
          return task;

      } catch (error) {
          task.status = 'FAILED';
          task.error = { message: error.message };
          await task.save();

          await AIAuditLog.create({
              workspaceId: task.workspaceId,
              userId: executedById,
              action: 'TASK_FAILED',
              taskId: task._id,
              status: 'FAILURE',
              details: { reason: error.message }
          });

          throw error;
      }
  }

  async cancelTask(taskId, cancelledById) {
      const task = await AITask.findById(taskId);
      if(!task) throw new Error("Task not found");
      if(['COMPLETED', 'FAILED', 'CANCELLED'].includes(task.status)) {
          throw new Error("Task is already in a terminal state");
      }

      task.status = 'CANCELLED';
      await task.save();

      await AIAuditLog.create({
          workspaceId: task.workspaceId,
          userId: cancelledById,
          action: 'TASK_CANCELLED',
          taskId: task._id,
          status: 'INFO'
      });

      return task;
  }
}

module.exports = new AITaskService();
