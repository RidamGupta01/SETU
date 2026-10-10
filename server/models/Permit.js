const mongoose = require('mongoose');
const softDeletePlugin = require('../plugins/softDelete');

const permitSchema = new mongoose.Schema({
  permitNumber: { type: String, required: true, unique: true },
  department: { type: mongoose.Schema.Types.ObjectId, ref: 'Department', required: true },
  applicant: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  roadName: { type: String, required: true },
  ward: { type: mongoose.Schema.Types.ObjectId, ref: 'Ward', required: true },
  location: {
    type: { type: String, enum: ['Point'], required: true, default: 'Point' },
    coordinates: { type: [Number], required: true } // [longitude, latitude]
  },
  path: {
    type: { type: String, enum: ['LineString'], required: true, default: 'LineString' },
    coordinates: { type: [[Number]], required: true } // Array of [longitude, latitude] pairs
  },
  radius: { type: Number, required: true, min: 10, max: 1000 },
  purpose: { type: String, required: true, minlength: 10 },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  depth: { type: Number, required: true, min: 0.1 },
  restorationPlan: { type: String, required: true },
  status: { type: String, required: true, enum: ['Pending', 'Approved', 'Active', 'Completed', 'Conflict', 'Rejected', 'Suspended'], default: 'Pending' },
  isJointExcavationSuggested: { type: Boolean, default: false },
  conflictingPermits: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Permit' }],
  isDeleted: { type: Boolean, default: false }
}, { timestamps: true });

permitSchema.index({ location: '2dsphere' });
permitSchema.index({ status: 1 });
permitSchema.index({ startDate: 1, endDate: 1 });
permitSchema.index({ isDeleted: 1 });

permitSchema.plugin(softDeletePlugin);

module.exports = mongoose.model('Permit', permitSchema);
