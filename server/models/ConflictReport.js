import mongoose from 'mongoose';

const conflictReportSchema = new mongoose.Schema({
  reportNumber: { type: String, required: true, unique: true },
  primaryPermit: { type: mongoose.Schema.Types.ObjectId, ref: 'Permit', required: true },
  conflictingPermits: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Permit', required: true }],
  overlapCoordinates: {
    type: { type: String, enum: ['Point'], required: true, default: 'Point' },
    coordinates: { type: [Number], required: true }
  },
  distanceMeters: { type: Number, required: true },
  severity: { type: String, required: true, enum: ['High', 'Medium', 'Low'], default: 'Medium' },
  status: { type: String, required: true, enum: ['Open', 'Under Review', 'Resolved', 'Dismissed'], default: 'Open' },
  resolutionNotes: { type: String }
}, { timestamps: true });

conflictReportSchema.index({ primaryPermit: 1 });
conflictReportSchema.index({ status: 1 });
conflictReportSchema.index({ overlapCoordinates: '2dsphere' });

export default mongoose.model('ConflictReport', conflictReportSchema);
