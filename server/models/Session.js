import mongoose from 'mongoose';

const sessionSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  token: { type: String, required: true, unique: true },
  ipAddress: { type: String, required: true },
  userAgent: { type: String },
  deviceType: { type: String, enum: ['desktop', 'mobile', 'tablet', 'unknown'], default: 'unknown' },
  isValid: { type: Boolean, default: true },
  expiresAt: { type: Date, required: true }
}, { timestamps: true });

sessionSchema.index({ user: 1 });
sessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // TTL index for automatic session removal

export default mongoose.model('Session', sessionSchema);
