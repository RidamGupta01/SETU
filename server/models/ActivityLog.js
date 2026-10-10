import mongoose from 'mongoose';

const activityLogSchema = new mongoose.Schema({
  actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  action: { type: String, required: true }, // e.g. "LOGIN_SUCCESS", "MAP_QUERY"
  details: { type: String },
  ipAddress: { type: String, required: true }
}, { timestamps: true });

activityLogSchema.index({ actor: 1, createdAt: 1 });

export default mongoose.model('ActivityLog', activityLogSchema);
