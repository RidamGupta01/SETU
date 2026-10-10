const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  entityType: { type: String, enum: ['permit', 'complaint'], required: true },
  entityId: { type: mongoose.Schema.Types.ObjectId, required: true },
  fromStatus: { type: String, required: true },
  toStatus: { type: String, required: true },
  note: { type: String },
  timestamp: { type: Date, default: Date.now }
}, { timestamps: true });

auditLogSchema.index({ actor: 1 });
auditLogSchema.index({ entityType: 1, entityId: 1 });
auditLogSchema.index({ createdAt: 1 });

module.exports = mongoose.model('AuditLog', auditLogSchema);
