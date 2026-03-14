// models/Submission.js
// Each event/achievement submitted by a staff member

const mongoose = require('mongoose');

const submissionSchema = new mongoose.Schema({

  // Who submitted this
  submittedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },

  // Which department this belongs to
  department: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Department',
    required: true,
  },

  // Category determines which section of newsletter it appears in
  category: {
    type: String,
    required: [true, 'Category is required'],
    enum: [
      'event',           // Department events, workshops
      'achievement',     // Awards, recognitions
      'research',        // Published papers, journals
      'sports',          // Sports achievements
      'nss',             // National Service Scheme
      'placement',       // Placements, campus interviews
      'alumni',          // Alumni activities
      'general',         // General college news
      'blood_donors',    // Blood donation camps
      'fine_arts',       // Fine arts competitions
      'yrc',             // Youth Red Cross
    ],
  },

  title: {
    type: String,
    required: [true, 'Title is required'],
    trim: true,
    maxlength: [200, 'Title cannot exceed 200 characters'],
  },

  description: {
    type: String,
    required: [true, 'Description is required'],
    trim: true,
    maxlength: [2000, 'Description cannot exceed 2000 characters'],
  },

  eventDate: {
    type: Date,
    required: [true, 'Event date is required'],
  },

  // Photo URLs from Cloudinary (max 5)
  photos: [{
    url: String,          // Full Cloudinary URL
    publicId: String,     // Cloudinary public_id (needed to delete)
    caption: String,      // Optional caption for the photo
  }],

  // Approval workflow
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'published'],
    default: 'pending',
  },

  // Who reviewed this (coordinator or superadmin)
  reviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },

  reviewNote: {
    type: String,
    trim: true,
    default: '',
    // Coordinator writes a note when rejecting
  },

  reviewedAt: {
    type: Date,
    default: null,
  },

  // Which newsletter issue this is assigned to (set by superadmin)
  newsletterIssue: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Newsletter',
    default: null,
  },

}, { timestamps: true });

// INDEX: Makes queries faster when filtering by these fields
submissionSchema.index({ department: 1, status: 1 });
submissionSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Submission', submissionSchema);
