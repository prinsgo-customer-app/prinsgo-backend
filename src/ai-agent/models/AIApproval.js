const mongoose = require('mongoose');

const aiApprovalSchema = new mongoose.Schema(
  {
    workspaceId: { type: mongoose.Schema.Types.ObjectId, ref: 'AIWorkspace', required: true },
    taskId: { type: mongoose.Schema.Types.ObjectId, ref: 'AITask', required: true },
    requestedById: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    action: { type: String, required: true },
    resource: { type: String, required: true },
    status: {
      type: String,
      enum: ['PENDING', 'APPROVED', 'REJECTED'],
      default: 'PENDING',
    },
    approvedById: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    rejectedById: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    reason: { type: String, default: '' },
    auditInformation: { type: Object, default: {} },
  },
  { timestamps: true }
);

module.exports = mongoose.model('AIApproval', aiApprovalSchema);
