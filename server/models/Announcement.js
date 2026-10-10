import mongoose from 'mongoose';

const announcementSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  content: { type: String, required: true },
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  targetAudience: { type: String, required: true, enum: ['Public', 'Officers', 'All'], default: 'All' },
  pinStart: { type: Date },
  pinEnd: { type: Date },
  isDeleted: { type: Boolean, default: false }
}, { timestamps: true });

announcementSchema.index({ isDeleted: 1 });
announcementSchema.index({ pinStart: 1, pinEnd: 1 });

export default mongoose.model('Announcement', announcementSchema);
