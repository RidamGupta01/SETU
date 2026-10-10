import mongoose from 'mongoose';

const permissionSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true, uppercase: true, trim: true },
  description: { type: String, required: true },
  module: { type: String, required: true, enum: ['users', 'permits', 'complaints', 'departments', 'map', 'settings'] }
}, { timestamps: true });

// No duplicate name index needed since name is configured as unique: true

export default mongoose.model('Permission', permissionSchema);
