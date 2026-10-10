import AppError from '../utils/appError.js';
import logger from '../utils/logger.js';

const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;
  error.statusCode = err.statusCode || 500;
  error.errorCode = err.errorCode || 'INTERNAL_SERVER_ERROR';

  // Log detailed error stack using Winston
  logger.error(`${error.errorCode} - ${error.message} - ${req.originalUrl} - ${req.method} - ${req.ip}\nStack: ${err.stack}`);

  // Mongoose bad ObjectId
  if (err.name === 'CastError') {
    const message = `Resource not found with ID of ${err.value}`;
    error = new AppError(message, 404, 'RESOURCE_NOT_FOUND');
  }

  // Mongoose duplicate key
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    const message = `Duplicate field value entered for ${field}`;
    error = new AppError(message, 400, 'DUPLICATE_KEY_ERROR');
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const details = Object.values(err.errors).map(val => val.message);
    const message = `Validation failed: ${details.join(', ')}`;
    error = new AppError(message, 400, 'VALIDATION_ERROR');
    error.details = details;
  }

  // JWT expired
  if (err.name === 'TokenExpiredError') {
    error = new AppError('Your session has expired. Please login again.', 401, 'TOKEN_EXPIRED');
  }

  // JWT invalid signature
  if (err.name === 'JsonWebTokenError') {
    error = new AppError('Invalid authentication token. Please login again.', 401, 'INVALID_TOKEN');
  }

  // Hardening: do not leak raw 500 error messages or details in production
  let responseMessage = error.message;
  if (error.statusCode === 500 && process.env.NODE_ENV === 'production') {
    responseMessage = 'An unexpected error occurred on the server. Please contact support.';
  }

  res.status(error.statusCode).json({
    success: false,
    message: responseMessage,
    errors: error.details || []
  });
};

export default errorHandler;
