const AITask = require('../models/AITask');
const AIAgent = require('../models/AIAgent');
const AIApprovalService = require('./AIApprovalService');
const AIAuditLog = require('../models/AIAuditLog');

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

      // Delegation to execution engine based on provider
      if (agent && agent.provider === 'hermes') {
          const HermesService = require('./HermesService'); // Lazy load to avoid circular deps
          return await HermesService.executeTask(task._id);
      }

      return task;
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
