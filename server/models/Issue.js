const mongoose = require('mongoose');

const issueSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  category: { type: String, required: true }, // e.g. pothole, blockage, pollution, garbage, waterlogging, streetlight
  urgencyScore: { type: Number, default: 0 },
  status: { 
    type: String, 
    enum: ['open', 'assigned', 'in_progress', 'resolved'], 
    default: 'open' 
  },
  photoUrl: { type: String },
  location: {
    type: {
      type: String,
      enum: ['Point'],
      required: true,
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      required: true,
    },
  },
  area: { type: String, required: true },
  
  // Single department responsible
  primaryDepartment: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Department' 
  },
  
  // Other departments suggested by AI for overlapping issues
  linkedDepartments: [{ 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Department' 
  }],
  
  clusterId: { type: String }, // Used to group duplicate/nearby issues

  reporterId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  
  aiSummary: { type: String },
  aiResolutionPlan: { type: String }, // Step-by-step resolution plan
  aiSuggestedDepartment: { type: String }, // String name of suggested department
  aiEstimatedTime: { type: String }, // e.g. "24 hours", "3 days"
  aiProfessionalOrder: { type: String }, // Formal directive for field workers

}, { timestamps: true });

issueSchema.index({ location: '2dsphere' });
issueSchema.index({ clusterId: 1 });

module.exports = mongoose.model('Issue', issueSchema);
