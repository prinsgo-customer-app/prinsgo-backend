const mongoose = require('mongoose');

const aiRepositorySchema = new mongoose.Schema(
  {
    workspaceId: { type: mongoose.Schema.Types.ObjectId, ref: 'AIWorkspace', required: true },
    integrationId: { type: mongoose.Schema.Types.ObjectId, ref: 'AIIntegration', required: true },
    name: { type: String, required: true },
    owner: { type: String, required: true },
    description: { type: String, default: '' },
    isAuthorized: { type: Boolean, default: false },
    permissions: {
      read: { type: Boolean, default: true },
      write: { type: Boolean, default: false },
    },
    metadata: { type: Object, default: {} },
  },
  { timestamps: true }
);

module.exports = mongoose.model('AIRepository', aiRepositorySchema);
