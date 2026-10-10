import { body, validationResult } from 'express-validator';

export const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array().map((err) => err.msg)
    });
  }
  next();
};

export const registerRules = [
  body('name').trim().notEmpty().withMessage('Name is required').isLength({ min: 2 }).withMessage('Name must be at least 2 characters'),
  body('email').trim().notEmpty().withMessage('Email is required').isEmail().withMessage('Invalid email address'),
  body('password').notEmpty().withMessage('Password is required').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('phone').trim().notEmpty().withMessage('Phone number is required').isMobilePhone('any').withMessage('Invalid phone number'),
  body('ward').trim().notEmpty().withMessage('Ward is required for citizens'),
];

export const adminCreateUserRules = [
  body('name').trim().notEmpty().withMessage('Name is required').isLength({ min: 2 }).withMessage('Name must be at least 2 characters'),
  body('email').trim().notEmpty().withMessage('Email is required').isEmail().withMessage('Invalid email address'),
  body('password').notEmpty().withMessage('Password is required').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('phone').trim().notEmpty().withMessage('Phone number is required').isMobilePhone('any').withMessage('Invalid phone number'),
  body('role').trim().notEmpty().withMessage('Role is required').isIn(['Citizen', 'Department Officer', 'Super Admin']).withMessage('Invalid role choice'),
  body('department').optional().trim().notEmpty().withMessage('Department must be a non-empty string'),
  body('ward').optional().trim().notEmpty().withMessage('Ward must be a non-empty string'),
];

export const loginRules = [
  body('email').trim().notEmpty().withMessage('Email is required').isEmail().withMessage('Invalid email address'),
  body('password').notEmpty().withMessage('Password is required'),
];

export const forgotPasswordRules = [
  body('email').trim().notEmpty().withMessage('Email is required').isEmail().withMessage('Invalid email address'),
];

export const resetPasswordRules = [
  body('password').notEmpty().withMessage('Password is required').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
];
