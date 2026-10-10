const mongoose = require('mongoose');

const departmentDependencySchema = new mongoose.Schema({
  issueId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Issue', 
    required: true 
  },
  dependentDepartment: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Department', 
    required: true 
  },
  prerequisiteDepartment: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Department', 
    required: true 
  },
  status: { 
    type: String, 
    enum: ['pending', 'unblocked'], 
    default: 'pending' 
  },
  estimatedTime: { type: String }, // e.g. "24 hours", passed from AI
  notes: { type: String },
}, { timestamps: true });

module.exports = mongoose.model('DepartmentDependency', departmentDependencySchema);
