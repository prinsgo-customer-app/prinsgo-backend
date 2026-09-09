const mongoose = require('mongoose');

const aiIntegrationSchema = new mongoose.Schema(
  {
    workspaceId: { type: mongoose.Schema.Types.ObjectId, ref: 'AIWorkspace', required: true },
    name: { type: String, required: true },
    integrationType: {
      type: String,
      enum: ['github', 'google_drive', 'telegram', 'whatsapp', 'custom'],
      required: true,
    },
    status: {
      type: String,
      enum: ['CONNECTED', 'DISCONNECTED', 'ERROR', 'NOT_CONFIGURED', 'DISABLED', 'BLOCKED'],
      default: 'NOT_CONFIGURED',
    },
    isEnabled: { type: Boolean, default: true },
    config: { type: Object, default: {} },
    lastTestedAt: { type: Date },
    lastError: { type: String },
  },
  { timestamps: true }
);

module.exports = mongoose.model('AIIntegration', aiIntegrationSchema);
