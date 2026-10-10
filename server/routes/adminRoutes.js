import express from 'express';
import {
  getUsers,
  createUser,
  updateUser,
  deleteUser,
  getAuditLogs,
  resolveConflict,
} from '../controllers/adminController.js';
import { protect, authorize } from '../middleware/auth.js';
import { adminCreateUserRules, handleValidationErrors } from '../validations/authValidation.js';

const router = express.Router();

router.use(protect);
router.use(authorize('Super Admin'));

router.route('/users')
  .get(getUsers)
  .post(adminCreateUserRules, handleValidationErrors, createUser);

router.route('/users/:id')
  .put(updateUser)
  .delete(deleteUser);

router.get('/audit-logs', getAuditLogs);
router.put('/permits/:id/resolve', resolveConflict);

export default router;
