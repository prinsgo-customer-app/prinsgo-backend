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

   async getMemories(workspaceId, page = 1, limit = 10, query = '') {
       const skip = (page - 1) * limit;
       const filter = { workspaceId };

       if (query) {
           filter.$or = [
               { key: { $regex: query, $options: 'i' } }
           ];
       }

       const memories = await AIMemory.find(filter)
           .sort({ createdAt: -1 })
           .skip(skip)
           .limit(limit);

       const total = await AIMemory.countDocuments(filter);
       return { memories, total, page, pages: Math.ceil(total / limit) };
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
