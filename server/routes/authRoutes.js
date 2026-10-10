import express from 'express';
import {
  register,
  login,
  getMe,
  updateProfile,
  forgotPassword,
  resetPassword,
  refreshToken,
  logout,
} from '../controllers/authController.js';
import { protect } from '../middleware/auth.js';
import { authLimiter, strictAuthLimiter } from '../middleware/security.js';
import {
  registerRules,
  loginRules,
  forgotPasswordRules,
  resetPasswordRules,
  handleValidationErrors,
} from '../validations/authValidation.js';

const router = express.Router();

// Public auth routes with validation and rate limiting
router.post('/register', authLimiter, registerRules, handleValidationErrors, register);
router.post('/login', strictAuthLimiter, loginRules, handleValidationErrors, login);

// Support both path structures for forgot/reset password
router.post('/forgotpassword', strictAuthLimiter, forgotPasswordRules, handleValidationErrors, forgotPassword);
router.post('/forgot-password', strictAuthLimiter, forgotPasswordRules, handleValidationErrors, forgotPassword);

// Support both PUT and POST, and both path structures for password reset
router.route('/resetpassword/:resettoken')
  .post(strictAuthLimiter, resetPasswordRules, handleValidationErrors, resetPassword)
  .put(strictAuthLimiter, resetPasswordRules, handleValidationErrors, resetPassword);

router.route('/reset-password/:resettoken')
  .post(strictAuthLimiter, resetPasswordRules, handleValidationErrors, resetPassword)
  .put(strictAuthLimiter, resetPasswordRules, handleValidationErrors, resetPassword);

// Refresh and Logout routes
router.post('/refresh-token', refreshToken);
router.post('/logout', logout);

// Protected routes
router.get('/me', protect, getMe);

// Support PATCH /profile, PUT /profile, and PUT /updatedetails
router.route('/profile')
  .put(protect, updateProfile)
  .patch(protect, updateProfile);

router.put('/updatedetails', protect, updateProfile);

export default router;
