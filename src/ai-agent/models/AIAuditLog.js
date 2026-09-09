const mongoose = require('mongoose');

const aiAuditLogSchema = new mongoose.Schema(
  {
    workspaceId: { type: mongoose.Schema.Types.ObjectId, ref: 'AIWorkspace', required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    action: { type: String, required: true },
    resource: { type: String },
    taskId: { type: mongoose.Schema.Types.ObjectId, ref: 'AITask' },
    providerId: { type: mongoose.Schema.Types.ObjectId, ref: 'AIProvider' },
    integrationId: { type: mongoose.Schema.Types.ObjectId, ref: 'AIIntegration' },
    approvalId: { type: mongoose.Schema.Types.ObjectId, ref: 'AIApproval' },
    status: {
      type: String,
      enum: ['SUCCESS', 'FAILURE', 'INFO'],
      required: true,
    },
    details: { type: Object, default: {} },
    ipAddress: { type: String },
    deviceMetadata: { type: Object, default: {} },
  },
  { timestamps: true }
);

module.exports = mongoose.model('AIAuditLog', aiAuditLogSchema);
