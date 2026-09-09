// Real Adapter for Hermes Agent Runtime
// Official repo: https://github.com/NousResearch/hermes-agent
const AIProvider = require('../models/AIProvider');
const AITask = require('../models/AITask');

class HermesService {
  async getStatus(workspaceId) {
    const provider = await AIProvider.findOne({ workspaceId, providerType: 'hermes' });
    if (!provider) return 'NOT_CONFIGURED';
    if (!provider.isEnabled) return 'DISABLED';

    const baseUrl = process.env.HERMES_BASE_URL;
    if (!baseUrl) {
      return 'NOT_CONFIGURED';
    }

    try {
      // Real health check to the Hermes RPC/REST runtime
      // Validated against hermes-agent gateway API Server implementation which explicitly registers /health
      const response = await fetch(`${baseUrl}/health`, {
        method: 'GET',
        headers: {
          'Authorization': process.env.HERMES_API_KEY ? `Bearer ${process.env.HERMES_API_KEY}` : ''
        }
      });

      if (response.ok) {
        return 'CONNECTED';
      } else {
        return 'ERROR';
      }
    } catch (error) {
      // Server is unreachable
      return 'ERROR';
    }
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

     task.status = 'RUNNING';
     await task.save();

     const baseUrl = process.env.HERMES_BASE_URL;

     try {
         // Real HTTP call to the Hermes Runtime.
         // Validated against hermes-agent gateway API Server implementation which explicitly registers /v1/chat/completions
         const response = await fetch(`${baseUrl}/v1/chat/completions`, {
             method: 'POST',
             headers: {
                 'Content-Type': 'application/json',
                 'Authorization': process.env.HERMES_API_KEY ? `Bearer ${process.env.HERMES_API_KEY}` : ''
             },
             body: JSON.stringify({
                 model: "hermes", // Depending on Hermes configuration
                 messages: [
                     { role: "system", content: "You are Hermes, an autonomous agent." },
                     { role: "user", content: task.instructions }
                 ]
             })
         });

         if (!response.ok) {
             throw new Error(`Hermes Runtime returned status ${response.status}: ${await response.text()}`);
         }

         const data = await response.json();

         // Successfully received real data
         task.status = 'COMPLETED';
         task.result = data;
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
