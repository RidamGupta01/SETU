import mongoose from 'mongoose';

const roleSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true, trim: true },
  description: { type: String, required: true },
  permissions: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Permission' }],
  isSystemDefault: { type: Boolean, default: false },
  isDeleted: { type: Boolean, default: false }
}, { timestamps: true });

roleSchema.index({ isDeleted: 1 });

export default mongoose.model('Role', roleSchema);
