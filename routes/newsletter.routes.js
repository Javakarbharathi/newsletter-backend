// routes/newsletter.routes.js
const express    = require('express');
const router     = express.Router();
const Newsletter = require('../models/Newsletter');
const Submission = require('../models/Submission');
const Department = require('../models/Department');
const { protect, restrictTo } = require('../middleware/auth.middleware');

// POST /api/newsletters
router.post('/', protect, restrictTo('superadmin'), async (req, res) => {
  try {
    const { volume, issueNumber, period, startDate, endDate, principalMessage } = req.body;
    const newsletter = await Newsletter.create({
      volume, issueNumber, period, startDate, endDate, principalMessage,
      createdBy: req.user._id,
    });
    res.status(201).json({ success: true, newsletter });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// GET /api/newsletters
router.get('/', protect, async (req, res) => {
  try {
    let filter = {};
    if (req.user.role === 'viewer') filter.status = 'published';
    const newsletters = await Newsletter.find(filter)
      .sort({ createdAt: -1 })
      .populate('createdBy', 'name')
      .lean();
    res.json({ success: true, newsletters });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/newsletters/:id
router.get('/:id', protect, async (req, res) => {
  try {
    const newsletter = await Newsletter.findById(req.params.id)
      .populate({
        path: 'submissions',
        populate: [
          { path: 'department', select: 'name code type order' },
          { path: 'submittedBy', select: 'name' },
        ],
      })
      .populate('createdBy', 'name')
      .lean();
    if (!newsletter) return res.status(404).json({ success: false, message: 'Newsletter not found.' });
    if (req.user.role === 'viewer' && newsletter.status !== 'published')
      return res.status(403).json({ success: false, message: 'Not published yet.' });
    res.json({ success: true, newsletter });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// PATCH /api/newsletters/:id/add-submissions
router.patch('/:id/add-submissions', protect, restrictTo('superadmin'), async (req, res) => {
  try {
    const { submissionIds } = req.body;
    const newsletter = await Newsletter.findById(req.params.id);
    if (!newsletter) return res.status(404).json({ success: false, message: 'Newsletter not found.' });

    const approved = await Submission.find({
      _id: { $in: submissionIds },
      status: { $in: ['approved', 'published'] },
    });

    const existing = new Set(newsletter.submissions.map(s => s.toString()));
    for (const sub of approved) {
      if (!existing.has(sub._id.toString())) {
        newsletter.submissions.push(sub._id);
        sub.status = 'published';
        sub.newsletterIssue = newsletter._id;
        await sub.save();
      }
    }
    await newsletter.save();
    res.json({ success: true, message: `${approved.length} submissions added.`, newsletter });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// PATCH /api/newsletters/:id/publish
router.patch('/:id/publish', protect, restrictTo('superadmin'), async (req, res) => {
  try {
    const newsletter = await Newsletter.findByIdAndUpdate(
      req.params.id,
      { status: 'published', publishedAt: new Date() },
      { new: true }
    );
    if (!newsletter) return res.status(404).json({ success: false, message: 'Newsletter not found.' });
    res.json({ success: true, message: 'Newsletter published!', newsletter });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/newsletters/:id/preview-data
// Returns ALL departments (always shown in template),
// with submitted+approved content merged into the ones that have content.
router.get('/:id/preview-data', protect, async (req, res) => {
  try {
    const newsletter = await Newsletter.findById(req.params.id)
      .populate({
        path: 'submissions',
        populate: { path: 'department', select: 'name code type order' },
      })
      .lean();

    if (!newsletter) return res.status(404).json({ success: false, message: 'Newsletter not found.' });

    // Fetch ALL active departments, sorted by order
    const allDepts = await Department.find({ isActive: true })
      .sort({ order: 1, name: 1 })
      .lean();

    // Map submissions by dept code
    const submissionsByDept = {};
    for (const sub of newsletter.submissions) {
      const code = sub.department?.code || 'GENERAL';
      if (!submissionsByDept[code]) submissionsByDept[code] = [];
      submissionsByDept[code].push(sub);
    }

    // Build sections array: every department appears, with its submissions (may be empty)
    const sections = allDepts.map(dept => ({
      department: dept,
      submissions: submissionsByDept[dept.code] || [],
    }));

    res.json({
      success: true,
      meta: {
        volume:           newsletter.volume,
        issueNumber:      newsletter.issueNumber,
        period:           newsletter.period,
        principalMessage: newsletter.principalMessage,
        publishedAt:      newsletter.publishedAt,
      },
      sections,
    });

  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
