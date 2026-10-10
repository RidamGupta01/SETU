import jwt from 'jsonwebtoken';
import asyncHandler from '../utils/asyncHandler.js';
import ErrorResponse from '../utils/errorResponse.js';
import User from '../models/User.js';

// Protect routes
export const protect = asyncHandler(async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    // Set token from Bearer token in header
    token = req.headers.authorization.split(' ')[1];
  }

  // Make sure token exists
  if (!token) {
    return next(new ErrorResponse('Not authorized to access this route', 401));
  }

  try {
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'setu_super_secret_jwt_key_2026');

    req.user = await User.findById(decoded.id).populate('role department');

    if (!req.user) {
      return next(new ErrorResponse('User not found with this token', 401));
    }

    next();
  } catch (err) {
    return next(new ErrorResponse('Not authorized to access this route', 401));
  }
});

// Grant access to specific roles
export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new ErrorResponse('Not authorized to access this route', 401));
    }
    const roleName = req.user.role && typeof req.user.role === 'object' ? req.user.role.name : req.user.role;
    if (!roleName) {
      return next(new ErrorResponse('Not authorized to access this route', 401));
    }
    const userRoleUpper = String(roleName).toUpperCase();
    const allowedRolesUpper = roles.map(r => r.toUpperCase());
    if (!allowedRolesUpper.includes(userRoleUpper)) {
      return next(
        new ErrorResponse(
          `User role ${roleName} is not authorized to access this route`,
          403
        )
      );
    }
    next();
  };
};
