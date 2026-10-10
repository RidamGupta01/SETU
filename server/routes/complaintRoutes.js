const express = require('express');
const router = express.Router();
const { requireAuth, requireRole } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');
const {
  createComplaint,
  getComplaints,
  getComplaintById,
  updateComplaintStatus,
  rateComplaint,
  confirmTriage,
  reassignComplaint,
  getAuditLogs
} = require('../controllers/complaintController');

router.route('/')
  .post(requireAuth, upload.single('photo'), createComplaint)
  .get(requireAuth, getComplaints);

router.route('/audit-logs')
  .get(requireAuth, getAuditLogs);

router.route('/:id')
  .get(requireAuth, getComplaintById);

router.route('/:id/status')
  .patch(requireAuth, requireRole(['officer', 'dept_admin', 'admin', 'super_admin']), updateComplaintStatus);

router.route('/:id/rate')
  .post(requireAuth, rateComplaint);

router.route('/:id/confirm-triage')
  .post(requireAuth, requireRole(['admin', 'super_admin']), confirmTriage);

router.route('/:id/reassign')
  .patch(requireAuth, requireRole(['officer', 'dept_admin', 'admin', 'super_admin']), reassignComplaint);

module.exports = router;
