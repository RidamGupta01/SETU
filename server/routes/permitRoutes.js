import express from 'express';
import {
  createPermit,
  getPermits,
  getPermitById,
  updatePermitStatus,
  approveOrRejectPermit,
  agreeJointExcavation,
  downloadPermitPDF,
} from '../controllers/permitController.js';
import { protect, authorize } from '../middleware/auth.js';
import { handleValidationErrors } from '../validations/authValidation.js';
import { createPermitRules, updatePermitStatusRules } from '../validations/permitValidation.js';

const router = express.Router();

router.route('/')
  .post(protect, authorize('Department Officer', 'Super Admin'), createPermitRules, handleValidationErrors, createPermit)
  .get(protect, getPermits);

router.route('/:id')
  .get(protect, getPermitById);

router.put('/:id/status', protect, authorize('Department Officer', 'Super Admin'), updatePermitStatusRules, handleValidationErrors, updatePermitStatus);
router.patch('/:id/status', protect, authorize('Super Admin'), handleValidationErrors, approveOrRejectPermit);
router.put('/:id/agree-joint', protect, authorize('Department Officer'), agreeJointExcavation);
router.get('/:id/pdf', protect, downloadPermitPDF);

export default router;
