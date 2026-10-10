import DepartmentRepository from '../repositories/DepartmentRepository.js';
import AppError from '../utils/appError.js';

// @desc    Get all departments
// @route   GET /api/departments
// @access  Public
export const getDepartments = async (req, res, next) => {
  try {
    const departments = await DepartmentRepository.find({ isDeleted: { $ne: true } });
    res.status(200).json({
      success: true,
      count: departments.length,
      data: departments,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create a department
// @route   POST /api/departments
// @access  Private (Super Admin)
export const createDepartment = async (req, res, next) => {
  try {
    const { name, code, description, color, headOfDepartment, phone, email } = req.body;

    const existingCode = await DepartmentRepository.findByCode(code);
    if (existingCode) {
      return next(new AppError(`Department with code '${code}' already exists`, 400, 'DEPARTMENT_EXISTS'));
    }

    const department = await DepartmentRepository.create({
      name,
      code,
      description,
      color,
      headOfDepartment,
      phone,
      email,
    });

    res.status(201).json({
      success: true,
      data: department,
    });
  } catch (error) {
    next(error);
  }
};
