const mongoose = require('mongoose');

const aiFileSchema = new mongoose.Schema(
  {
    workspaceId: { type: mongoose.Schema.Types.ObjectId, ref: 'AIWorkspace', required: true },
    uploadedById: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    filename: { type: String, required: true },
    fileType: { type: String, required: true },
    size: { type: Number },
    url: { type: String, required: true }, // Should be secure URL, not public if sensitive
    purpose: { type: String, default: 'analysis' },
    metadata: { type: Object, default: {} },
  },
  { timestamps: true }
);

module.exports = mongoose.model('AIFile', aiFileSchema);
