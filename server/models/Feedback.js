import mongoose from 'mongoose';

const feedbackSchema = new mongoose.Schema({
  complaint: { type: mongoose.Schema.Types.ObjectId, ref: 'Complaint', required: true },
  citizen: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  rating: { type: Number, required: true, min: 1, max: 5 },
  comment: { type: String, maxlength: 500 },
  isFlagged: { type: Boolean, default: false }
}, { timestamps: true });

feedbackSchema.index({ complaint: 1 });
feedbackSchema.index({ rating: 1 });

export default mongoose.model('Feedback', feedbackSchema);
