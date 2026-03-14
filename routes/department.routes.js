// routes/department.routes.js
// CRUD for college departments

const express    = require('express');
const router     = express.Router();
const Department = require('../models/Department');
const { protect, restrictTo } = require('../middleware/auth.middleware');


// ── GET /api/departments ──────────────────────────────────
// Get all departments — any logged-in user
router.get('/', protect, async (req, res) => {
  try {
    const depts = await Department.find({ isActive: true })
      .sort({ order: 1, name: 1 })
      .populate('coordinator', 'name email')
      .lean();
    res.json({ success: true, count: depts.length, departments: depts });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});


// ── POST /api/departments ─────────────────────────────────
// Create department — superadmin only
// Body: { name, code, type, degrees, order }
router.post('/', protect, restrictTo('superadmin'), async (req, res) => {
  try {
    const dept = await Department.create(req.body);
    res.status(201).json({ success: true, department: dept });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});


// ── PUT /api/departments/:id ──────────────────────────────
// Update department — superadmin only
router.put('/:id', protect, restrictTo('superadmin'), async (req, res) => {
  try {
    const dept = await Department.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!dept) return res.status(404).json({ success: false, message: 'Department not found.' });
    res.json({ success: true, department: dept });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});


// ── DELETE /api/departments/:id ───────────────────────────
// Soft delete — just sets isActive:false
router.delete('/:id', protect, restrictTo('superadmin'), async (req, res) => {
  try {
    await Department.findByIdAndUpdate(req.params.id, { isActive: false });
    res.json({ success: true, message: 'Department deactivated.' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});


// ── POST /api/departments/seed ────────────────────────────
// Seeds all GASC departments — run once during setup
router.post('/seed', protect, restrictTo('superadmin'), async (req, res) => {
  try {
    const departments = [
      // AIDED DEPARTMENTS
      { name: 'General',            code: 'GEN',     type: 'aided',   degrees: [],                              order: 1  },
      { name: 'Tamil',              code: 'TAMIL',   type: 'aided',   degrees: ['B.A', 'M.A', 'M.Phil', 'Ph.D'], order: 2  },
      { name: 'English',            code: 'ENG',     type: 'aided',   degrees: ['B.A', 'M.A', 'M.Phil', 'Ph.D'], order: 3  },
      { name: 'English Unaided',    code: 'ENG-U',   type: 'unaided', degrees: ['B.A'],                          order: 4  },
      { name: 'Mathematics',        code: 'MATH',    type: 'aided',   degrees: ['B.Sc', 'M.Sc', 'M.Phil'],       order: 5  },
      { name: 'Mathematics Unaided',code: 'MATH-U',  type: 'unaided', degrees: ['B.Sc'],                         order: 6  },
      { name: 'Physics',            code: 'PHY',     type: 'aided',   degrees: ['B.Sc', 'M.Sc', 'M.Phil'],       order: 7  },
      { name: 'Physics Unaided',    code: 'PHY-U',   type: 'unaided', degrees: ['B.Sc'],                         order: 8  },
      { name: 'Chemistry',          code: 'CHEM',    type: 'aided',   degrees: ['B.Sc', 'M.Sc', 'M.Phil'],       order: 9  },
      { name: 'Botany',             code: 'BOT',     type: 'aided',   degrees: ['B.Sc', 'M.Sc', 'M.Phil'],       order: 10 },
      { name: 'Zoology',            code: 'ZOO',     type: 'aided',   degrees: ['B.Sc', 'M.Sc'],                 order: 11 },
      { name: 'History',            code: 'HIST',    type: 'aided',   degrees: ['B.A', 'M.A', 'M.Phil'],         order: 12 },
      { name: 'Economics',          code: 'ECO',     type: 'aided',   degrees: ['B.A', 'M.A', 'M.Phil'],         order: 13 },
      { name: 'Commerce',           code: 'COM',     type: 'aided',   degrees: ['B.Com', 'M.Com', 'M.Phil'],     order: 14 },
      { name: 'Commerce CA',        code: 'COM-CA',  type: 'aided',   degrees: ['B.Com'],                        order: 15 },
      { name: 'Commerce Unaided',   code: 'COM-U',   type: 'unaided', degrees: ['B.Com'],                        order: 16 },
      { name: 'Computer Science',   code: 'CS',      type: 'aided',   degrees: ['B.Sc', 'M.Sc', 'M.Phil'],       order: 17 },
      { name: 'Computer Science Unaided', code:'CS-U', type: 'unaided', degrees: ['B.Sc'],                       order: 18 },
      { name: 'Political Science',  code: 'POL',     type: 'aided',   degrees: ['B.A', 'M.A'],                   order: 19 },
      { name: 'Management Unaided', code: 'MGMT-U',  type: 'unaided', degrees: ['BBA', 'MBA'],                   order: 20 },
      { name: 'Information Technology', code: 'IT',  type: 'aided',   degrees: ['B.Sc', 'M.Sc'],                 order: 21 },
      // CLUBS & FORUMS
      { name: 'NSS',                code: 'NSS',     type: 'aided',   degrees: [],                              order: 22 },
      { name: 'NCC',                code: 'NCC',     type: 'aided',   degrees: [],                              order: 23 },
      { name: 'Blood Donors Club',  code: 'BDC',     type: 'aided',   degrees: [],                              order: 24 },
      { name: 'Fine Arts Club',     code: 'FAC',     type: 'aided',   degrees: [],                              order: 25 },
      { name: 'Youth Red Cross',    code: 'YRC',     type: 'aided',   degrees: [],                              order: 26 },
      { name: 'Alumni Association', code: 'ALUMNI',  type: 'aided',   degrees: [],                              order: 27 },
      { name: 'Career Guidance Cell', code: 'CGC',   type: 'aided',   degrees: [],                              order: 28 },
      { name: 'Physical Education', code: 'PE',      type: 'aided',   degrees: [],                              order: 29 },
    ];

    // insertMany with ordered:false continues even if a duplicate exists
    await Department.insertMany(departments, { ordered: false });
    res.json({ success: true, message: `Departments seeded successfully!` });
  } catch (error) {
    // Code 11000 = duplicate key — means some already exist
    if (error.code === 11000) {
      return res.json({ success: true, message: 'Some departments already existed — others added.' });
    }
    res.status(500).json({ success: false, message: error.message });
  }
});


module.exports = router;
