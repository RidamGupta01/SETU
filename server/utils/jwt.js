import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import SessionRepository from '../repositories/SessionRepository.js';
import { toUserDTO } from '../dto/UserDTO.js';

export const sendTokenResponse = async (user, statusCode, req, res) => {
  const roleName = user.role && typeof user.role === 'object' ? user.role.name : user.role;
  const deptCode = user.department && typeof user.department === 'object' ? user.department.code : (user.department || undefined);

  // 1. Generate short-lived Access Token (JWT) - 15 minutes
  const token = jwt.sign(
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

  // 2. Generate Refresh Token
  const refreshToken = crypto.randomBytes(40).toString('hex');

  // 3. Store Session in Database
  await SessionRepository.create({
    user: user._id,
    token: refreshToken,
    ipAddress: req.ip || '127.0.0.1',
    userAgent: req.headers['user-agent'] || 'unknown',
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    isValid: true
  });

  // 4. Set Refresh Token HTTP-only cookie
  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
  });

  // 5. Send Response
  res.status(statusCode).json({
    success: true,
    token,
    user: toUserDTO(user)
  });
};
