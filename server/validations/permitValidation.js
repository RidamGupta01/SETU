import { body } from 'express-validator';

export const createPermitRules = [
  body('roadName').trim().notEmpty().withMessage('Road name is required'),
  body('ward').notEmpty().withMessage('Ward is required').isMongoId().withMessage('Invalid ward ID format'),
  body('path')
    .notEmpty().withMessage('Path is required')
    .custom((value) => {
      if (typeof value !== 'object' || value.type !== 'LineString') {
        throw new Error('Path must be a GeoJSON LineString object');
      }
      if (!Array.isArray(value.coordinates) || value.coordinates.length < 2) {
        throw new Error('Path must contain at least 2 coordinates');
      }
      for (const coord of value.coordinates) {
        if (!Array.isArray(coord) || coord.length !== 2) {
          throw new Error('Each coordinate must be a [longitude, latitude] pair');
        }
        const [lng, lat] = coord;
        if (typeof lng !== 'number' || lng < -180 || lng > 180) {
          throw new Error('Longitude must be between -180 and 180');
        }
        if (typeof lat !== 'number' || lat < -90 || lat > 90) {
          throw new Error('Latitude must be between -90 and 90');
        }
      }
      return true;
    }),
  body('radius').isInt({ min: 10, max: 1000 }).withMessage('Radius must be between 10 and 1000 meters'),
  body('purpose').trim().notEmpty().withMessage('Purpose of digging is required').isLength({ min: 10 }).withMessage('Purpose description must be at least 10 characters'),
  body('startDate').isISO8601().toDate().withMessage('Invalid start date format'),
  body('endDate').isISO8601().toDate().withMessage('Invalid end date format')
    .custom((value, { req }) => {
      if (new Date(value) <= new Date(req.body.startDate)) {
        throw new Error('End date must be after start date');
      }
      return true;
    }),
  body('depth').isFloat({ min: 0.1, max: 50 }).withMessage('Depth must be between 0.1 and 50 meters'),
  body('restorationPlan').trim().notEmpty().withMessage('Restoration plan is required'),
];

export const updatePermitStatusRules = [
  body('status').isIn(['Pending', 'Approved', 'Active', 'Completed', 'Conflict', 'Rejected', 'Suspended']).withMessage('Invalid permit status'),
  body('remarks').optional().trim(),
];
