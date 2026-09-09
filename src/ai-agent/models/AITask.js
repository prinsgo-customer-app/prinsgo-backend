const mongoose = require('mongoose');

const aiTaskSchema = new mongoose.Schema(
  {
    workspaceId: { type: mongoose.Schema.Types.ObjectId, ref: 'AIWorkspace', required: true },
    creatorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    agentId: { type: mongoose.Schema.Types.ObjectId, ref: 'AIAgent', required: true },
    instructions: { type: String, required: true },
    status: {
      type: String,
      enum: ['QUEUED', 'WAITING_FOR_APPROVAL', 'RUNNING', 'COMPLETED', 'FAILED', 'CANCELLED', 'BLOCKED'],
      default: 'QUEUED',
    },
    requiredPermissions: [{ type: String }],
    requiresApproval: { type: Boolean, default: false },
    approvalId: { type: mongoose.Schema.Types.ObjectId, ref: 'AIApproval' },
    executionMetadata: { type: Object, default: {} },
    result: { type: Object, default: null },
    error: { type: Object, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model('AITask', aiTaskSchema);
