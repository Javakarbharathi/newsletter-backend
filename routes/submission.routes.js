// routes/submission.routes.js
// Staff submit events; coordinators approve/reject; admin publishes

const express    = require('express');
const router     = express.Router();
const Submission = require('../models/Submission');
const { protect, restrictTo } = require('../middleware/auth.middleware');
const { upload, deleteImage }  = require('../utils/cloudinary');


// ── POST /api/submissions ─────────────────────────────────
// Staff creates a new submission with optional photos
// upload.array('photos', 5) allows up to 5 photos
router.post('/', protect, restrictTo('staff', 'coordinator', 'superadmin'), upload.array('photos', 5), async (req, res) => {
  try {
    const { title, description, category, eventDate, photoCaptions } = req.body;

    // Build photos array from uploaded files
    const photos = (req.files || []).map((file, index) => ({
      url:      file.path,              // Cloudinary URL
      publicId: file.filename,          // Cloudinary public_id
      caption:  photoCaptions?.[index] || '',
    }));

    const submission = await Submission.create({
      title,
      description,
      category,
      eventDate,
      photos,
      submittedBy: req.user._id,
      department:  req.user.department,
    });

    await submission.populate('submittedBy', 'name email');
    await submission.populate('department', 'name code');

    res.status(201).json({ success: true, submission });

  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});


// ── GET /api/submissions ──────────────────────────────────
// Get submissions based on role:
//   staff       → only their own
//   coordinator → only their department's pending/approved
//   superadmin  → all submissions
router.get('/', protect, async (req, res) => {
  try {
    let filter = {};
    const { status, category, department } = req.query;

    if (req.user.role === 'staff') {
      filter.submittedBy = req.user._id;
    } else if (req.user.role === 'coordinator') {
      filter.department = req.user.department._id;
    }
    // superadmin sees everything — no filter

    if (status)     filter.status = status;
    if (category)   filter.category = category;
    if (department && req.user.role === 'superadmin') filter.department = department;

    const submissions = await Submission.find(filter)
      .sort({ createdAt: -1 })
      .populate('submittedBy', 'name email')
      .populate('department', 'name code type')
      .populate('reviewedBy', 'name')
      .lean();

    res.json({ success: true, count: submissions.length, submissions });

  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});


// ── GET /api/submissions/:id ──────────────────────────────
// Get a single submission
router.get('/:id', protect, async (req, res) => {
  try {
    const submission = await Submission.findById(req.params.id)
      .populate('submittedBy', 'name email')
      .populate('department', 'name code type')
      .populate('reviewedBy', 'name')
      .lean();

    if (!submission) return res.status(404).json({ success: false, message: 'Submission not found.' });

    res.json({ success: true, submission });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});


// ── PUT /api/submissions/:id ──────────────────────────────
// Staff can edit their own pending submission
router.put('/:id', protect, restrictTo('staff', 'coordinator', 'superadmin'), upload.array('photos', 5), async (req, res) => {
  try {
    const submission = await Submission.findById(req.params.id);
    if (!submission) return res.status(404).json({ success: false, message: 'Submission not found.' });

    // Staff can only edit their own, and only if still pending
    if (req.user.role === 'staff') {
      if (submission.submittedBy.toString() !== req.user._id.toString()) {
        return res.status(403).json({ success: false, message: 'Not your submission.' });
      }
      if (submission.status !== 'pending') {
        return res.status(400).json({ success: false, message: 'Cannot edit a reviewed submission.' });
      }
    }

    const { title, description, category, eventDate, photoCaptions } = req.body;
    if (title)       submission.title       = title;
    if (description) submission.description = description;
    if (category)    submission.category    = category;
    if (eventDate)   submission.eventDate   = eventDate;

    // Add any new uploaded photos
    if (req.files?.length) {
      const newPhotos = req.files.map((file, i) => ({
        url:      file.path,
        publicId: file.filename,
        caption:  photoCaptions?.[i] || '',
      }));
      submission.photos.push(...newPhotos);
    }

    await submission.save();
    res.json({ success: true, submission });

  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});


// ── PATCH /api/submissions/:id/review ────────────────────
// Coordinator or superadmin approves or rejects
// Body: { action: 'approve' | 'reject', reviewNote: '...' }
router.patch('/:id/review', protect, restrictTo('coordinator', 'superadmin'), async (req, res) => {
  try {
    const { action, reviewNote } = req.body;
    if (!['approve', 'reject'].includes(action)) {
      return res.status(400).json({ success: false, message: 'Action must be approve or reject.' });
    }

    const submission = await Submission.findById(req.params.id);
    if (!submission) return res.status(404).json({ success: false, message: 'Submission not found.' });

    // Coordinator can only review their own department
    if (req.user.role === 'coordinator') {
      if (submission.department.toString() !== req.user.department._id.toString()) {
        return res.status(403).json({ success: false, message: 'Not your department.' });
      }
    }

    submission.status     = action === 'approve' ? 'approved' : 'rejected';
    submission.reviewedBy = req.user._id;
    submission.reviewNote = reviewNote || '';
    submission.reviewedAt = new Date();

    await submission.save();
    res.json({ success: true, message: `Submission ${submission.status}.`, submission });

  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});


// ── DELETE /api/submissions/:id ───────────────────────────
// Staff can delete their own pending submission
// Superadmin can delete any
router.delete('/:id', protect, async (req, res) => {
  try {
    const submission = await Submission.findById(req.params.id);
    if (!submission) return res.status(404).json({ success: false, message: 'Submission not found.' });

    const isOwner = submission.submittedBy.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'superadmin';

    if (!isOwner && !isAdmin) {
      return res.status(403).json({ success: false, message: 'Not authorized.' });
    }

    // Delete photos from Cloudinary
    for (const photo of submission.photos) {
      if (photo.publicId) await deleteImage(photo.publicId);
    }

    await submission.deleteOne();
    res.json({ success: true, message: 'Submission deleted.' });

  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});


module.exports = router;
