const mongoose = require('mongoose');

const aiProviderSchema = new mongoose.Schema(
  {
    workspaceId: { type: mongoose.Schema.Types.ObjectId, ref: 'AIWorkspace', required: true },
    name: { type: String, required: true },
    providerType: {
      type: String,
      enum: ['google', 'openai', 'anthropic', 'hermes', 'custom'],
      required: true,
    },
    status: {
      type: String,
      enum: ['CONNECTED', 'DISCONNECTED', 'ERROR', 'NOT_CONFIGURED', 'DISABLED', 'BLOCKED'],
      default: 'NOT_CONFIGURED',
    },
    isEnabled: { type: Boolean, default: true },
    config: { type: Object, default: {} }, // E.g., model preferences, timeout settings. No secrets here.
    lastTestedAt: { type: Date },
    lastError: { type: String },
  },
  { timestamps: true }
);

module.exports = mongoose.model('AIProvider', aiProviderSchema);
