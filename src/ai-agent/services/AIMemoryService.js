const AIMemory = require('../models/AIMemory');

class AIMemoryService {
   async createMemory(workspaceId, type, key, content, metadata = {}, agentId = null, userId = null) {
       const memory = new AIMemory({
           workspaceId,
           type,
           key,
           content,
           relevanceMetadata: metadata,
           agentId,
           userId
       });
       await memory.save();
       return memory;
   }

   async getMemoryByKey(workspaceId, key, type) {
       return AIMemory.findOne({ workspaceId, key, type });
   }

   async searchMemory(workspaceId, query) {
       // In a full implementation, this might use MongoDB text search or vector search.
       // For this baseline, we provide basic pattern matching on key/content strings.
       return AIMemory.find({
           workspaceId,
           $or: [
               { key: { $regex: query, $options: 'i' } }
           ]
       });
   }

   async deleteMemory(memoryId) {
       return AIMemory.findByIdAndDelete(memoryId);
   }
}

module.exports = new AIMemoryService();
