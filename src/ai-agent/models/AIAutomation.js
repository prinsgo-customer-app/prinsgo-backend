const mongoose = require('mongoose');

const aiAutomationSchema = new mongoose.Schema(
  {
    workspaceId: { type: mongoose.Schema.Types.ObjectId, ref: 'AIWorkspace', required: true },
    name: { type: String, required: true },
    description: { type: String, default: '' },
    triggerType: {
      type: String,
      enum: ['SCHEDULE', 'EVENT', 'MANUAL'],
      required: true,
    },
    triggerConfig: { type: Object, default: {} },
    agentId: { type: mongoose.Schema.Types.ObjectId, ref: 'AIAgent', required: true },
    instructions: { type: String, required: true },
    status: {
      type: String,
      enum: ['ENABLED', 'DISABLED', 'ERROR', 'RUNNING'],
      default: 'DISABLED',
    },
    lastRunAt: { type: Date },
    lastError: { type: String },
    metadata: { type: Object, default: {} },
  },
  { timestamps: true }
);

module.exports = mongoose.model('AIAutomation', aiAutomationSchema);
