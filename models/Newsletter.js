// models/Newsletter.js
// Represents one published newsletter issue

const mongoose = require('mongoose');

const newsletterSchema = new mongoose.Schema({

  // e.g. "Volume 19"
  volume: {
    type: Number,
    required: true,
  },

  // e.g. 2 (for No:2)
  issueNumber: {
    type: Number,
    required: true,
  },

  // e.g. "October - December, 2024"
  period: {
    type: String,
    required: true,
    trim: true,
  },

  // e.g. "2024-10-01"
  startDate: Date,
  endDate: Date,

  // All approved submissions included in this issue
  submissions: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Submission',
  }],

  // Who created/published this newsletter
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },

  // "draft" = being built | "published" = visible to all
  status: {
    type: String,
    enum: ['draft', 'published'],
    default: 'draft',
  },

  publishedAt: {
    type: Date,
    default: null,
  },

  // Optional: principal's message for this issue
  principalMessage: {
    type: String,
    trim: true,
    default: '',
  },

  // Cover photo URL (Cloudinary)
  coverPhoto: {
    type: String,
    default: '',
  },

}, { timestamps: true });

module.exports = mongoose.model('Newsletter', newsletterSchema);
