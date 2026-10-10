const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  recipient: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  recipientDepartment: { type: mongoose.Schema.Types.ObjectId, ref: 'Department' },
  title: { type: String, required: true },
  message: { type: String, required: true },
  type: { type: String, enum: ['Conflict', 'PermitStatus', 'ComplaintStatus', 'General'], required: true },
  isRead: { type: Boolean, default: false },
  metadata: {
    permitId: { type: mongoose.Schema.Types.ObjectId, ref: 'Permit' },
    complaintId: { type: mongoose.Schema.Types.ObjectId, ref: 'Complaint' }
  }
}, { timestamps: true });

notificationSchema.index({ recipient: 1, isRead: 1 });
notificationSchema.index({ recipientDepartment: 1, isRead: 1 });

module.exports = mongoose.model('Notification', notificationSchema);
