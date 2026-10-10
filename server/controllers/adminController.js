import UserRepository from '../repositories/UserRepository.js';
import RoleRepository from '../repositories/RoleRepository.js';
import DepartmentRepository from '../repositories/DepartmentRepository.js';
import PermitRepository from '../repositories/PermitRepository.js';
import ActivityLogRepository from '../repositories/ActivityLogRepository.js';
import NotificationRepository from '../repositories/NotificationRepository.js';
import WardRepository from '../repositories/WardRepository.js';
import AppError from '../utils/appError.js';
import { toUserDTO } from '../dto/UserDTO.js';
import { getIO } from '../sockets/socketHandler.js';

// @desc    Get all users
// @route   GET /api/admin/users
// @access  Private (Super Admin)
export const getUsers = async (req, res, next) => {
  try {
    const users = await UserRepository.findWithDetails();
    res.status(200).json({
      success: true,
      data: users.map(user => toUserDTO(user)),
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create a new user (Admin only)
// @route   POST /api/admin/users
// @access  Private (Super Admin)
export const createUser = async (req, res, next) => {
  try {
    const { name, email, password, role, phone, department, ward } = req.body;

    // Check if user already exists
    const existingUser = await UserRepository.findByEmail(email);
    if (existingUser) {
      return next(new AppError('User already registered with this email', 400, 'USER_EXISTS'));
    }

    // Resolve Role ID
    const roleDoc = await RoleRepository.findByName(role);
    if (!roleDoc) {
      return next(new AppError(`Specified role '${role}' is not configured in system`, 404, 'ROLE_NOT_FOUND'));
    }

    let deptId = null;
    if (role === 'Department Officer') {
      if (!department) {
        return next(new AppError('Department is required for Department Officers', 400, 'BAD_REQUEST'));
      }
      const dept = await DepartmentRepository.findById(department);
      if (!dept) {
        return next(new AppError('Department not found', 404, 'DEPARTMENT_NOT_FOUND'));
      }
      deptId = dept._id;
    }

    let wardId = null;
    if (role === 'Citizen') {
      if (!ward) {
        return next(new AppError('Ward is required for Citizens', 400, 'BAD_REQUEST'));
      }
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
      wardId = wardDoc._id;
    }

    // Create user
    const user = await UserRepository.create({
      name,
      email,
      password,
      role: roleDoc._id,
      phone,
      ward: role === 'Citizen' ? wardId : undefined,
      department: deptId,
      isVerified: true
    });

    const populatedUser = await UserRepository.findByIdWithDetails(user._id);

    // Track admin activity
    await ActivityLogRepository.log(
      req.user._id,
      'ADMIN_CREATE_USER',
      `Admin created user account: ${populatedUser.email} (role: ${roleDoc.name})`,
      req.ip
    );

    res.status(201).json({
      success: true,
      data: toUserDTO(populatedUser)
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update user details/role/department
// @route   PUT /api/admin/users/:id
// @access  Private (Super Admin)
export const updateUser = async (req, res, next) => {
  try {
    const { role, department, name, phone } = req.body;

    const userToUpdate = await UserRepository.findById(req.params.id);
    if (!userToUpdate) {
      return next(new AppError(`User not found with id of ${req.params.id}`, 404, 'USER_NOT_FOUND'));
    }

    // Resolve Role ID
    const roleDoc = await RoleRepository.findByName(role);
    if (!roleDoc) {
      return next(new AppError(`Specified role '${role}' is not configured in system`, 404, 'ROLE_NOT_FOUND'));
    }

    let deptId = null;
    if (roleDoc.name === 'Department Officer') {
      if (!department) {
        return next(new AppError('Department ID is required for Department Officers', 400, 'BAD_REQUEST'));
      }
      const dept = await DepartmentRepository.findById(department);
      if (!dept) {
        return next(new AppError('Department not found', 404, 'DEPARTMENT_NOT_FOUND'));
      }
      deptId = dept._id;
    }

    const updateFields = {
      name,
      phone,
      role: roleDoc._id,
      department: deptId
    };

    const updatedUser = await UserRepository.update(req.params.id, updateFields);
    const populatedUser = await UserRepository.findByIdWithDetails(updatedUser._id);

    // Log admin activity
    await ActivityLogRepository.log(
      req.user._id,
      'ADMIN_UPDATE_USER',
      `Admin updated user details for: ${populatedUser.email} (new role: ${roleDoc.name})`,
      req.ip
    );

    res.status(200).json({
      success: true,
      data: toUserDTO(populatedUser),
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete user
// @route   DELETE /api/admin/users/:id
// @access  Private (Super Admin)
export const deleteUser = async (req, res, next) => {
  try {
    const user = await UserRepository.findById(req.params.id);
    if (!user) {
      return next(new AppError(`User not found with id of ${req.params.id}`, 404, 'USER_NOT_FOUND'));
    }

    // Soft delete the user
    await UserRepository.delete(req.params.id);

    // Log activity
    await ActivityLogRepository.log(
      req.user._id,
      'ADMIN_DELETE_USER',
      `Admin deleted user profile: ${user.email}`,
      req.ip
    );

    res.status(200).json({
      success: true,
      data: {},
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get audit logs
// @route   GET /api/admin/audit-logs
// @access  Private (Super Admin)
export const getAuditLogs = async (req, res, next) => {
  try {
    const logs = await ActivityLogRepository.find({}, 'actor', '', { createdAt: -1 });
    // Populate actor info manually or via query since ActivityLog has ref to User
    const populatedLogs = await ActivityLogRepository.model.find()
      .populate('actor', 'name email role')
      .sort('-createdAt')
      .limit(100);

    res.status(200).json({
      success: true,
      data: populatedLogs,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Manually override and resolve a permit conflict
// @route   PUT /api/admin/permits/:id/resolve
// @access  Private (Super Admin)
export const resolveConflict = async (req, res, next) => {
  try {
    const { status, remarks } = req.body; // status: 'Approved' or 'Rejected'

    if (!['Approved', 'Rejected'].includes(status)) {
      return next(new AppError('Conflict resolution status must be Approved or Rejected', 400, 'BAD_REQUEST'));
    }

    const permit = await PermitRepository.findByIdWithDetails(req.params.id);
    if (!permit) {
      return next(new AppError(`Permit not found with id of ${req.params.id}`, 404, 'PERMIT_NOT_FOUND'));
    }

    if (permit.status !== 'Conflict') {
      return next(new AppError('This permit is not flagged with a conflict status', 400, 'BAD_REQUEST'));
    }

    permit.status = status;
    permit.isJointExcavationSuggested = false; // cleared
    await permit.save();

    // Log activity
    await ActivityLogRepository.log(
      req.user._id,
      'ADMIN_RESOLVE_CONFLICT',
      `Admin resolved conflict for permit ${permit._id} with status: ${status}. Remarks: ${remarks || ''}`,
      req.ip
    );

    // Notify departments in conflict
    const io = getIO();
    if (io) {
      const notification = await NotificationRepository.create({
        recipientDepartment: permit.department._id,
        title: 'Conflict Resolved by Admin',
        message: `Your permit on ${permit.roadName} previously flagged for conflict has been manually ${status} by Nodal Officer. Remarks: ${remarks || ''}`,
        type: 'PermitStatus',
        metadata: { permitId: permit._id },
      });

      io.to(`dept_${permit.department._id.toString()}`).emit('notification', notification);
      io.emit('permit_updated', permit);
    }

    res.status(200).json({
      success: true,
      data: permit,
    });
  } catch (error) {
    next(error);
  }
};
