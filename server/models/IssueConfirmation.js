const mongoose = require('mongoose');

const issueConfirmationSchema = new mongoose.Schema({
  issueId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Issue', 
    required: true 
  },
  citizenId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  isResolved: { type: Boolean, required: true },
  comment: { type: String },
}, { timestamps: true });

module.exports = mongoose.model('IssueConfirmation', issueConfirmationSchema);
