const mongoose = require('mongoose');

const deptWorkSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String },
  department: { type: String, required: true },
  area: { type: String, required: true },
  startsOn: { type: String, required: true },
  endsOn: { type: String, required: true },
  status: { type: String, default: 'scheduled' },
  lat: { type: Number },
  lng: { type: Number },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

module.exports = mongoose.model('DeptWork', deptWorkSchema);
