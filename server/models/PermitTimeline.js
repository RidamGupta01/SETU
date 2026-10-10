import mongoose from 'mongoose';

const permitTimelineSchema = new mongoose.Schema({
  permit: { type: mongoose.Schema.Types.ObjectId, ref: 'Permit', required: true },
  actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  previousStatus: { type: String },
  newStatus: { type: String, required: true },
  actionPerformed: { type: String, required: true }, // e.g. "APPROVED_WITH_CONDITIONS", "SUBMITTED"
  remarks: { type: String },
  digitalSignature: { type: String } // Base64 or cert link
}, { timestamps: true });

permitTimelineSchema.index({ permit: 1 });

export default mongoose.model('PermitTimeline', permitTimelineSchema);
