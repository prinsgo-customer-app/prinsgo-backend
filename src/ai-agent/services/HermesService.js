// Adapter for Hermes Agent
// Official repo: https://github.com/NousResearch/hermes-agent
const AIProvider = require('../models/AIProvider');
const AITask = require('../models/AITask');

class HermesService {
  async getStatus(workspaceId) {
    const provider = await AIProvider.findOne({ workspaceId, providerType: 'hermes' });
    if (!provider) return 'NOT_CONFIGURED';
    if (!provider.isEnabled) return 'DISABLED';

    // We strictly enforce BLOCKED if the runtime or API Keys are missing.
    // The official Hermes Agent requires an LLM API key (like OPENAI_API_KEY or OPENROUTER_API_KEY)
    // to process inference. Without it, the hermes process errors immediately.
    if (!process.env.HERMES_BASE_URL && !process.env.OPENAI_API_KEY && !process.env.OPENROUTER_API_KEY) {
      return 'BLOCKED'; // Missing runtime or LLM inference credentials
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

     // The deployment of Hermes Runtime failed in this environment because it strictly requires
     // external LLM provider API credentials (e.g. OPENAI_API_KEY) to start and execute tasks successfully.
     // Without these credentials, we cannot perform a real end-to-end execution.
     // According to the instruction: "If deployment cannot be performed in the current environment,
     // STOP and clearly report what external deployment/credential/network setup is required. Never fake the result."

     task.status = 'FAILED';
     task.error = { message: "Hermes execution cannot be performed. Real Hermes Runtime requires external LLM Provider API Keys (OPENAI_API_KEY, OPENROUTER_API_KEY) which are missing in this environment." };
     await task.save();
     throw new Error(task.error.message);
  }
}

module.exports = new HermesService();
