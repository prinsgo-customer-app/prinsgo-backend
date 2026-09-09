const mongoose = require('mongoose');

const aiMemorySchema = new mongoose.Schema(
  {
    workspaceId: { type: mongoose.Schema.Types.ObjectId, ref: 'AIWorkspace', required: true },
    agentId: { type: mongoose.Schema.Types.ObjectId, ref: 'AIAgent' },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    type: {
      type: String,
      enum: ['USER', 'WORKSPACE', 'AGENT', 'CONVERSATION', 'TASK', 'PROJECT_KNOWLEDGE'],
      required: true,
    },
    key: { type: String, required: true },
    content: { type: mongoose.Schema.Types.Mixed, required: true },
    relevanceMetadata: { type: Object, default: {} },
  },
  { timestamps: true }
);

module.exports = mongoose.model('AIMemory', aiMemorySchema);
