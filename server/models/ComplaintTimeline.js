const mongoose = require('mongoose');

const complaintTimelineSchema = new mongoose.Schema({
  complaint: { type: mongoose.Schema.Types.ObjectId, ref: 'Complaint', required: true },
  actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  previousStatus: { type: String },
  newStatus: { type: String, required: true },
  remarks: { type: String, required: true },
  message: { type: String }
}, { timestamps: true });

complaintTimelineSchema.index({ complaint: 1 });

module.exports = mongoose.model('ComplaintTimeline', complaintTimelineSchema);
