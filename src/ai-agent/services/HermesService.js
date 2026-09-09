// Adapter for Hermes Agent
// Official repo: https://github.com/NousResearch/hermes-agent
const AIProvider = require('../models/AIProvider');
const AITask = require('../models/AITask');

class HermesService {
  async getStatus(workspaceId) {
    const provider = await AIProvider.findOne({ workspaceId, providerType: 'hermes' });
    if (!provider) return 'NOT_CONFIGURED';
    if (!provider.isEnabled) return 'DISABLED';

    if (!process.env.HERMES_BASE_URL) {
      return 'BLOCKED'; // Missing runtime
    }

    return provider.status;
  }

  async executeTask(taskId) {
     const task = await AITask.findById(taskId);
     if(!task) throw new Error("Task not found");

     const status = await this.getStatus(task.workspaceId);
     if (status !== 'CONNECTED') {
         task.status = 'FAILED';
         task.error = { message: `Hermes runtime is ${status}. Cannot execute task.` };
         await task.save();
         throw new Error(`Hermes runtime is ${status}`);
     }

     // In a real implementation, this would make an HTTP call to the Hermes Runtime REST API.
     // For this integration, we simulate the delegation (but we do not pretend it succeeded if it can't).
     // We will leave it RUNNING, waiting for webhooks from Hermes, or fail if no base URL.
     try {
         // Fake call stub:
         // const response = await axios.post(`${process.env.HERMES_BASE_URL}/v1/tasks`, { ... })
         task.status = 'RUNNING';
         await task.save();
         return task;
     } catch (error) {
         task.status = 'FAILED';
         task.error = { message: error.message };
         await task.save();
         throw error;
     }
  }
}

module.exports = new HermesService();
