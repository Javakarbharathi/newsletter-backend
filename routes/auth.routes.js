// routes/auth.routes.js
// Handles: Register, Login, Get current user profile

const express = require('express');
const router = express.Router();

const User = require('../models/User');
const { protect, restrictTo, generateToken } = require('../middleware/auth.middleware');


// POST /api/auth/register
router.post('/register', protect, restrictTo('superadmin'), async (req, res) => {
  try {
    const { name, email, password, role, department } = req.body;

    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'Email already registered.'
      });
    }

    const user = await User.create({
      name,
      email,
      password,
      role,
      department
    });

    res.status(201).json({
      success: true,
      message: 'User created successfully',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });

  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});


// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {

    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email and password.'
      });
    }

    const user = await User.findOne({ email })
      .select('+password')
      .populate('department', 'name code type');

    if (!user || !user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.'
      });
    }

    const isMatch = await user.comparePassword(password);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.'
      });
    }

    const token = generateToken(user._id);

    res.json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        department: user.department
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});


// GET /api/auth/me
router.get('/me', protect, async (req, res) => {
  res.json({
    success: true,
    user: req.user
  });
});


// GET /api/auth/users
router.get('/users', protect, restrictTo('superadmin'), async (req, res) => {
  try {

    const users = await User.find()
      .populate('department', 'name code')
      .lean();

    res.json({
      success: true,
      count: users.length,
      users
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});


// PUT /api/auth/users/:id
router.put('/users/:id', protect, restrictTo('superadmin'), async (req, res) => {
  try {

    const { name, role, department, isActive } = req.body;

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { name, role, department, isActive },
      { new: true, runValidators: true }
    ).populate('department', 'name code');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found.'
      });
    }

    res.json({
      success: true,
      user
    });

  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});


// TEMP ROUTE: create first admin
router.post('/seed-admin', async (req, res) => {
  try {

    const existing = await User.findOne({ role: 'superadmin' });

    if (existing) {
      return res.status(400).json({
        message: 'Admin already exists'
      });
    }

    const admin = await User.create({
      name: 'Principal Admin',
      email: 'admin@gasc.edu',
      password: 'Admin@123',
      role: 'superadmin'
    });

    res.json({
      success: true,
      message: 'Admin created! Login: admin@gasc.edu / Admin@123'
    });

  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

// TEMP STAFF USER FOR TESTING
router.post('/seed-staff', async (req, res) => {
  try {

    const user = await User.create({
      name: 'Computer Science Staff',
      email: 'csstaff@gasc.edu',
      password: 'Staff@123',
      role: 'staff',

      // Department ID from MongoDB
      department: '69b4b60bf27d6669ec904c76'
    });

    res.json({
      success: true,
      message: 'Test staff created!',
      login: 'csstaff@gasc.edu / Staff@123'
    });

  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

module.exports = router;

