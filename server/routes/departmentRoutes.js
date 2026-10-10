import express from 'express';
import { getDepartments, createDepartment } from '../controllers/departmentController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

router.route('/')
  .get(getDepartments)
  .post(protect, authorize('Super Admin'), createDepartment);

export default router;
