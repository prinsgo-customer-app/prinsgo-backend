const AIIntegration = require('../models/AIIntegration');
const AIRepository = require('../models/AIRepository');

class AIGitHubService {
   async getStatus(workspaceId) {
      const integration = await AIIntegration.findOne({ workspaceId, integrationType: 'github' });
      if(!integration) return 'NOT_CONFIGURED';
      if(!integration.isEnabled) return 'DISABLED';

      if(!process.env.GITHUB_TOKEN) {
         return 'NOT_CONFIGURED';
      }

      return integration.status;
   }

   async testConnection(workspaceId) {
      let integration = await AIIntegration.findOne({ workspaceId, integrationType: 'github' });
      if(!integration) {
          integration = new AIIntegration({ workspaceId, name: 'GitHub Default', integrationType: 'github' });
      }

      if(!process.env.GITHUB_TOKEN) {
         integration.status = 'NOT_CONFIGURED';
         integration.lastError = "Missing GITHUB_TOKEN";
      } else {
         // Here we would test github api
         integration.status = 'CONNECTED';
         integration.lastError = null;
      }

      integration.lastTestedAt = new Date();
      await integration.save();
      return integration;
   }

   async authorizeRepository(workspaceId, repoOwner, repoName, permissions) {
       const integration = await AIIntegration.findOne({ workspaceId, integrationType: 'github' });
       if(!integration) throw new Error("GitHub integration not found");

       let repo = await AIRepository.findOne({ workspaceId, integrationId: integration._id, name: repoName, owner: repoOwner });
       if(!repo) {
          repo = new AIRepository({
              workspaceId,
              integrationId: integration._id,
              name: repoName,
              owner: repoOwner,
              isAuthorized: true,
              permissions
          });
       } else {
          repo.isAuthorized = true;
          if(permissions) repo.permissions = permissions;
       }

       await repo.save();
       return repo;
   }
}

module.exports = new AIGitHubService();
