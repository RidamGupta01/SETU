import mongoose from 'mongoose';

const settingsSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true, uppercase: true, trim: true },
  value: { type: mongoose.Schema.Types.Mixed, required: true },
  description: { type: String },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

export default mongoose.model('Settings', settingsSchema);
