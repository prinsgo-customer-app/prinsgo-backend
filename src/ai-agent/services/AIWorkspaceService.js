const AIWorkspace = require('../models/AIWorkspace');

class AIWorkspaceService {
    async createWorkspace(ownerId, name, description) {
        const workspace = new AIWorkspace({
            owner: ownerId,
            name,
            description
        });
        await workspace.save();
        return workspace;
    }

    async getWorkspace(workspaceId) {
        return AIWorkspace.findById(workspaceId);
    }

    async getUserWorkspaces(userId) {
        return AIWorkspace.find({ owner: userId, isActive: true });
    }
}

module.exports = new AIWorkspaceService();
