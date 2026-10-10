import mongoose from 'mongoose';
import softDeletePlugin from '../plugins/softDelete.js';

const roadSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  ward: { type: mongoose.Schema.Types.ObjectId, ref: 'Ward', required: true },
  status: { type: String, enum: ['Open', 'Closed', 'Partially Closed'], default: 'Open' },
  closureReason: { type: String },
  closedByPermit: { type: mongoose.Schema.Types.ObjectId, ref: 'Permit' },
  geometry: {
    type: { type: String, enum: ['LineString'], required: true, default: 'LineString' },
    coordinates: { type: [[Number]], required: true } // Array of coordinates: [[lon, lat], [lon, lat]]
  },
  isDeleted: { type: Boolean, default: false }
}, { timestamps: true });

roadSchema.index({ geometry: '2dsphere' });
roadSchema.index({ status: 1 });
roadSchema.index({ isDeleted: 1 });

roadSchema.plugin(softDeletePlugin);

export default mongoose.model('Road', roadSchema);
