const express = require('express');
const router = express.Router();
const User = require('../models/User');
const jwt = require('jsonwebtoken');
const { requireAuth } = require('../middleware/authMiddleware');

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'hackathon-secret', {
    expiresIn: '30d',
  });
};

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { email, password, fullName, role, department } = req.body;

    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ error: 'User already exists' });
    }

    let deptId = null;
    if (department) {
      const Department = require('../models/Department');
      const deptDoc = await Department.findOne({ name: department });
      if (deptDoc) {
        deptId = deptDoc._id;
      } else {
        return res.status(400).json({ error: 'Invalid department' });
      }
    }

    const user = await User.create({
      email,
      password,
      fullName,
      role: role || 'citizen',
      department: deptId,
    });

    if (user) {
      res.status(201).json({
        _id: user._id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        department: department, // Return the string name back to frontend
        token: generateToken(user._id),
      });
    } else {
      res.status(400).json({ error: 'Invalid user data' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email }).populate('department');

    if (user && (await user.comparePassword(password))) {
      res.json({
        _id: user._id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        department: user.department ? user.department.name : null,
        token: generateToken(user._id),
      });
    } else {
      res.status(401).json({ error: 'Invalid email or password' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/auth/me
router.get('/me', requireAuth, async (req, res) => {
  try {
    // req.user might not be populated depending on requireAuth middleware
    const user = await User.findById(req.user._id).populate('department');
    res.json({
      _id: user._id,
      fullName: user.fullName,
      email: user.email,
      role: user.role,
      department: user.department ? user.department.name : null,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
