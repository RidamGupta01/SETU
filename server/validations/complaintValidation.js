import { body } from 'express-validator';

export const createComplaintRules = [
  body('complaintType').isIn(['Unauthorized Digging', 'Road Damage', 'Water Leakage', 'Cable Exposure', 'Debris Accumulation', 'Other']).withMessage('Invalid complaint type'),
  body('description').trim().notEmpty().withMessage('Description is required').isLength({ min: 10 }).withMessage('Description must be at least 10 characters'),
  body('longitude').isFloat({ min: -180, max: 180 }).withMessage('Longitude must be between -180 and 180'),
  body('latitude').isFloat({ min: -90, max: 90 }).withMessage('Latitude must be between -90 and 90'),
  body('ward').notEmpty().withMessage('Ward is required').isMongoId().withMessage('Invalid ward ID format'),
];

export const updateComplaintStatusRules = [
  body('status').isIn(['Received', 'Assigned', 'In Progress', 'Resolved', 'Rejected']).withMessage('Invalid status'),
  body('remarks').trim().notEmpty().withMessage('Remarks are required for status update'),
];

export const submitFeedbackRules = [
  body('rating').isInt({ min: 1, max: 5 }).withMessage('Rating must be an integer between 1 and 5'),
  body('comment').optional().trim().isLength({ max: 500 }).withMessage('Comment cannot exceed 500 characters'),
];
