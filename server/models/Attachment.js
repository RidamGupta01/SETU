import mongoose from 'mongoose';

const attachmentSchema = new mongoose.Schema({
  associatedEntityId: { type: mongoose.Schema.Types.ObjectId, required: true }, // Polymorphic reference
  entityType: { type: String, required: true, enum: ['Permit', 'Complaint'] },
  fileName: { type: String, required: true },
  fileUrl: { type: String, required: true },
  fileSize: { type: Number, required: true }, // In bytes
  mimeType: { type: String, required: true },
  uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
}, { timestamps: true });

attachmentSchema.index({ associatedEntityId: 1, entityType: 1 });

export default mongoose.model('Attachment', attachmentSchema);
