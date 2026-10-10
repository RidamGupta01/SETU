const mongoose = require('mongoose');

const issueUpdateSchema = new mongoose.Schema({
  issueId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Issue', 
    required: true 
  },
  updatedBy: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  departmentId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Department' 
  },
  previousStatus: { type: String },
  newStatus: { type: String, required: true },
  comment: { type: String },
  photoUrl: { type: String },
}, { timestamps: true });

module.exports = mongoose.model('IssueUpdate', issueUpdateSchema);
