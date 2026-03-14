// routes/newsletter.routes.js
// Superadmin builds and publishes newsletter issues

const express    = require('express');
const router     = express.Router();
const Newsletter = require('../models/Newsletter');
const Submission = require('../models/Submission');
const { protect, restrictTo } = require('../middleware/auth.middleware');


// ── POST /api/newsletters ─────────────────────────────────
// Create a new newsletter draft — superadmin only
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


// ── GET /api/newsletters ──────────────────────────────────
// Get all newsletters
// Viewers only see published ones; admin sees all
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


// ── GET /api/newsletters/:id ──────────────────────────────
// Get full newsletter with all submissions populated
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

    // Viewers can only see published
    if (req.user.role === 'viewer' && newsletter.status !== 'published') {
      return res.status(403).json({ success: false, message: 'Not published yet.' });
    }

    res.json({ success: true, newsletter });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});


// ── PATCH /api/newsletters/:id/add-submissions ───────────
// Superadmin adds approved submissions to a newsletter draft
// Body: { submissionIds: ['id1', 'id2', ...] }
router.patch('/:id/add-submissions', protect, restrictTo('superadmin'), async (req, res) => {
  try {
    const { submissionIds } = req.body;
    const newsletter = await Newsletter.findById(req.params.id);
    if (!newsletter) return res.status(404).json({ success: false, message: 'Newsletter not found.' });

    // Only approved submissions can be added
    const approved = await Submission.find({
      _id: { $in: submissionIds },
      status: 'approved',
    });

    // Add to newsletter (avoid duplicates using Set)
    const existing = new Set(newsletter.submissions.map(s => s.toString()));
    for (const sub of approved) {
      if (!existing.has(sub._id.toString())) {
        newsletter.submissions.push(sub._id);
        // Mark as published
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


// ── PATCH /api/newsletters/:id/publish ───────────────────
// Publish the newsletter — makes it visible to all
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


// ── GET /api/newsletters/:id/preview-data ────────────────
// Returns newsletter data structured by department
// Used by the frontend template to auto-populate sections
router.get('/:id/preview-data', protect, async (req, res) => {
  try {
    const newsletter = await Newsletter.findById(req.params.id)
      .populate({
        path: 'submissions',
        populate: { path: 'department', select: 'name code type order' },
      })
      .lean();

    if (!newsletter) return res.status(404).json({ success: false, message: 'Newsletter not found.' });

    // Group submissions by department for template rendering
    const grouped = {};
    for (const sub of newsletter.submissions) {
      const deptCode = sub.department?.code || 'GENERAL';
      if (!grouped[deptCode]) {
        grouped[deptCode] = {
          department: sub.department,
          submissions: [],
        };
      }
      grouped[deptCode].submissions.push(sub);
    }

    // Sort departments by their order field
    const sections = Object.values(grouped).sort(
      (a, b) => (a.department?.order || 99) - (b.department?.order || 99)
    );

    res.json({
      success: true,
      meta: {
        volume:     newsletter.volume,
        issueNumber: newsletter.issueNumber,
        period:     newsletter.period,
        principalMessage: newsletter.principalMessage,
        publishedAt: newsletter.publishedAt,
      },
      sections,
    });

  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});


module.exports = router;
