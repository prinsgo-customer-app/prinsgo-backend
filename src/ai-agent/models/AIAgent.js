const mongoose = require('mongoose');

const aiAgentSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    systemInstructions: { type: String, default: '' },
    provider: { type: String, enum: ['google', 'openai', 'anthropic', 'hermes', 'custom'], required: true },
    model: { type: String, required: true },
    isEnabled: { type: Boolean, default: true },
    tools: [{ type: String }],
    permissions: [{ type: String }],
    workspaceId: { type: mongoose.Schema.Types.ObjectId, ref: 'AIWorkspace', required: true },
    memorySettings: { type: Object, default: {} },
    executionLimits: { type: Object, default: {} },
    approvalRequirements: [{ type: String }],
    metadata: { type: Object, default: {} },
  },
  { timestamps: true }
);

module.exports = mongoose.model('AIAgent', aiAgentSchema);
