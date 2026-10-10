const mongoose = require('mongoose');
const softDeletePlugin = require('../plugins/softDelete');

const complaintSchema = new mongoose.Schema({
  complaintNumber: { type: String, required: true, unique: true },
  citizen: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  department: { type: mongoose.Schema.Types.ObjectId, ref: 'Department', default: null },
  complaintType: { type: String, required: true, enum: ['Unauthorized Digging', 'Road Damage', 'Water Leakage', 'Cable Exposure', 'Debris Accumulation', 'Other'] },
  description: { type: String, required: true },
  location: {
    type: { type: String, enum: ['Point'], required: true, default: 'Point' },
    coordinates: { type: [Number], required: true } // [longitude, latitude]
  },
  photoUrl: { type: String },
  ward: { type: mongoose.Schema.Types.ObjectId, ref: 'Ward', required: true },
  priority: { type: String, enum: ['Low', 'Medium', 'High', 'Critical'], default: 'Medium' },
  status: { type: String, enum: ['Received', 'Assigned', 'In Progress', 'Resolved', 'Rejected'], default: 'Received' },
  slaDeadline: { type: Date, required: true },
  isSlaViolated: { type: Boolean, default: false },
  rating: { type: Number, min: 1, max: 5 },
  ratingComment: { type: String },
  aiCategory: { type: String, enum: ["pothole", "broken_road", "open_sewer", "waterlogging", "exposed_wiring", "debris_blockage", "other"] },
  aiSeverity: { type: String, enum: ["low", "medium", "high"] },
  aiConfidence: { type: Number },
  aiDescription: { type: String },
  aiReviewStatus: { type: String, enum: ["auto_routed", "needs_review", "not_analyzed"], default: "not_analyzed" },
  isDeleted: { type: Boolean, default: false }
}, { timestamps: true });

complaintSchema.index({ location: '2dsphere' });
complaintSchema.index({ status: 1 });
complaintSchema.index({ department: 1 });
complaintSchema.index({ isSlaViolated: 1 });
complaintSchema.index({ isDeleted: 1 });

complaintSchema.plugin(softDeletePlugin);

module.exports = mongoose.model('Complaint', complaintSchema);
