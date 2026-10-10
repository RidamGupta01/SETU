import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import UserRepository from '../repositories/UserRepository.js';
import DepartmentRepository from '../repositories/DepartmentRepository.js';
import RoleRepository from '../repositories/RoleRepository.js';
import SessionRepository from '../repositories/SessionRepository.js';
import ActivityLogRepository from '../repositories/ActivityLogRepository.js';
import WardRepository from '../repositories/WardRepository.js';
import AppError from '../utils/appError.js';
import { sendTokenResponse } from '../utils/jwt.js';
import sendEmail from '../services/emailService.js';
import { toUserDTO } from '../dto/UserDTO.js';
import logger from '../utils/logger.js';

// @desc    Register user (Citizens only)
// @route   POST /api/auth/register
// @access  Public
export const register = async (req, res, next) => {
  try {
    const { name, email, password, phone, ward } = req.body;

    // Check if user already exists
    const existingUser = await UserRepository.findByEmail(email);
    if (existingUser) {
      return next(new AppError('User already registered with this email', 400, 'USER_EXISTS'));
    }

    // Resolve Role ID (Strictly Citizen for public registration)
    const roleDoc = await RoleRepository.findByName('Citizen');
    if (!roleDoc) {
      return next(new AppError("Citizen role is not configured in the system", 404, 'ROLE_NOT_FOUND'));
    }

    if (!ward) {
      return next(new AppError('Ward is required for Citizen registration', 400, 'BAD_REQUEST'));
    }

    // Resolve Ward ID
    let wardDoc;
    const isMongoId = /^[0-9a-fA-F]{24}$/.test(ward);
    if (isMongoId) {
      wardDoc = await WardRepository.findById(ward);
    } else {
      wardDoc = await WardRepository.findOne({ name: ward });
    }
    if (!wardDoc) {
      return next(new AppError(`Ward '${ward}' not found`, 404, 'WARD_NOT_FOUND'));
    }

    // Create user
    const user = await UserRepository.create({
      name,
      email,
      password,
      role: roleDoc._id,
      phone,
      ward: wardDoc._id,
      isVerified: true // Default to true for testing
    });

    // Populate role and details
    const populatedUser = await UserRepository.findByIdWithDetails(user._id);

    // Track activity
    await ActivityLogRepository.log(user._id, 'REGISTER', `User registered as Citizen`, req.ip);

    // Generate token and send response
    await sendTokenResponse(populatedUser, 201, req, res);
  } catch (error) {
    next(error);
  }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Check for user
    const user = await UserRepository.findByEmailWithPassword(email);
    if (!user) {
      return next(new AppError('Invalid credentials', 401, 'INVALID_CREDENTIALS'));
    }

    // Check if password matches
    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return next(new AppError('Invalid credentials', 401, 'INVALID_CREDENTIALS'));
    }

    // Populate roles/departments
    const populatedUser = await UserRepository.findByIdWithDetails(user._id);

    // Track activity
    await ActivityLogRepository.log(user._id, 'LOGIN', 'User logged in', req.ip);

    // Generate token and send response
    await sendTokenResponse(populatedUser, 200, req, res);
  } catch (error) {
    next(error);
  }
};

// @desc    Get current logged in user
// @route   GET /api/auth/me
// @access  Private
export const getMe = async (req, res, next) => {
  try {
    const user = await UserRepository.findByIdWithDetails(req.user.id);
    if (!user) {
      return next(new AppError('User not found', 404, 'USER_NOT_FOUND'));
    }

    res.status(200).json({
      success: true,
      data: toUserDTO(user),
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update user profile
// @route   PUT/PATCH /api/auth/profile
// @access  Private
export const updateProfile = async (req, res, next) => {
  try {
    const fieldsToUpdate = {};
    if (req.body.name) fieldsToUpdate.name = req.body.name;
    if (req.body.phone) fieldsToUpdate.phone = req.body.phone;

    const roleName = req.user.role && typeof req.user.role === 'object' ? req.user.role.name : req.user.role;
    if (roleName === 'Citizen' && req.body.ward) {
      // Resolve ward
      let wardDoc;
      const isMongoId = /^[0-9a-fA-F]{24}$/.test(req.body.ward);
      if (isMongoId) {
        wardDoc = await WardRepository.findById(req.body.ward);
      } else {
        wardDoc = await WardRepository.findOne({ name: req.body.ward });
      }
      if (wardDoc) {
        fieldsToUpdate.ward = wardDoc._id;
      }
    }

    const user = await UserRepository.update(req.user.id, fieldsToUpdate);
    const populatedUser = await UserRepository.findByIdWithDetails(user._id);

    // Track activity
    await ActivityLogRepository.log(user._id, 'UPDATE_PROFILE', 'User updated profile details', req.ip);

    res.status(200).json({
      success: true,
      data: toUserDTO(populatedUser),
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Forgot Password
// @route   POST /api/auth/forgotpassword
// @access  Public
export const forgotPassword = async (req, res, next) => {
  try {
    const user = await UserRepository.findByEmail(req.body.email);
    if (!user) {
      return next(new AppError('There is no user registered with that email address', 404, 'EMAIL_NOT_FOUND'));
    }

    // Get reset token
    const resetToken = user.getResetPasswordToken();
    await user.save({ validateBeforeSave: false });

    // Create reset url (Vite client default port is 5173)
    const resetUrl = `${req.protocol}://${req.get('host').replace('5000', '5173')}/resetpassword/${resetToken}`;
    const message = `You are receiving this email because you (or someone else) has requested the reset of a password. Please make a POST request to: \n\n ${resetUrl}`;

    try {
      await sendEmail({
        email: user.email,
        subject: 'SETU Password Reset Token',
        message,
        html: `
          <h3>SETU – Single Window E-Coordination</h3>
          <p>You requested a password reset. Click the link below to set a new password:</p>
          <p><a href="${resetUrl}" target="_blank" style="padding: 10px 20px; background-color: #0f766e; color: white; text-decoration: none; border-radius: 5px; display: inline-block;">Reset Password</a></p>
          <p>If you did not request this, please ignore this email.</p>
        `,
      });

      res.status(200).json({ success: true, data: 'Password reset link sent to your email.' });
    } catch (err) {
      logger.error(`Error sending forgot-password email: ${err.message}`);
      user.passwordResetToken = undefined;
      user.passwordResetExpires = undefined;
      await user.save({ validateBeforeSave: false });

      return next(new AppError('Email could not be sent', 500, 'EMAIL_SEND_FAILED'));
    }
  } catch (error) {
    next(error);
  }
};

// @desc    Reset Password
// @route   POST/PUT /api/auth/resetpassword/:resettoken
// @access  Public
export const resetPassword = async (req, res, next) => {
  try {
    // Get hashed token
    const passwordResetToken = crypto
      .createHash('sha256')
      .update(req.params.resettoken)
      .digest('hex');

    const user = await UserRepository.findOne({
      passwordResetToken,
      passwordResetExpires: { $gt: Date.now() },
    });

    if (!user) {
      return next(new AppError('Invalid or expired password reset token', 400, 'INVALID_RESET_TOKEN'));
    }

    // Set new password
    user.password = req.body.password;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save();

    const populatedUser = await UserRepository.findByIdWithDetails(user._id);

    // Track activity
    await ActivityLogRepository.log(user._id, 'RESET_PASSWORD', 'User successfully reset password', req.ip);

    await sendTokenResponse(populatedUser, 200, req, res);
  } catch (error) {
    next(error);
  }
};

// @desc    Refresh Access Token
// @route   POST /api/auth/refresh-token
// @access  Public
export const refreshToken = async (req, res, next) => {
  try {
    let token = null;
    const cookies = req.headers.cookie;
    if (cookies) {
      const parts = cookies.split(';');
      for (const part of parts) {
        const [key, value] = part.trim().split('=');
        if (key === 'refreshToken') {
          token = decodeURIComponent(value);
          break;
        }
      }
    }

    if (!token) {
      return next(new AppError('No refresh token provided', 401, 'UNAUTHORIZED'));
    }

    // Find session in database
    const session = await SessionRepository.findByToken(token);
    if (!session || !session.isValid || session.expiresAt < new Date()) {
      return next(new AppError('Invalid or expired refresh token', 401, 'UNAUTHORIZED'));
    }

    const user = await UserRepository.findByIdWithDetails(session.user._id);
    if (!user) {
      return next(new AppError('User not found', 401, 'UNAUTHORIZED'));
    }

    const roleName = user.role && typeof user.role === 'object' ? user.role.name : user.role;
    const deptCode = user.department && typeof user.department === 'object' ? user.department.code : (user.department || undefined);

    // Sign a new short-lived access token
    const accessToken = jwt.sign(
      { 
        id: user._id,
        userId: user._id,
        role: roleName,
        department: deptCode
      },
      process.env.JWT_SECRET || 'setu_super_secret_jwt_key_2026',
      {
        expiresIn: '15m',
      }
    );

    res.status(200).json({
      success: true,
      token: accessToken,
      user: toUserDTO(user)
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Logout / Invalidate Session
// @route   POST /api/auth/logout
// @access  Public
export const logout = async (req, res, next) => {
  try {
    let token = null;
    const cookies = req.headers.cookie;
    if (cookies) {
      const parts = cookies.split(';');
      for (const part of parts) {
        const [key, value] = part.trim().split('=');
        if (key === 'refreshToken') {
          token = decodeURIComponent(value);
          break;
        }
      }
    }

    if (token) {
      // Invalidate the session in database
      await SessionRepository.invalidateSession(token);
    }

    // Clear response cookie
    res.clearCookie('refreshToken', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict'
    });

    res.status(200).json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    next(error);
  }
};
