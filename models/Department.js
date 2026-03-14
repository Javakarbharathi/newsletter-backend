// models/Department.js
// Stores all college departments (aided and unaided)

const mongoose = require('mongoose');

const departmentSchema = new mongoose.Schema({

  name: {
    type: String,
    required: [true, 'Department name is required'],
    unique: true,
    trim: true,
    // Examples: "Tamil", "English", "Computer Science", "BCA"
  },

  // Short code used in newsletter sections
  code: {
    type: String,
    required: true,
    uppercase: true,
    trim: true,
    // Examples: "TAMIL", "ENG", "CS", "BCA"
  },

  // Aided = government funded | Unaided = self-funded
  type: {
    type: String,
    enum: ['aided', 'unaided'],
    required: true,
  },

  // All degree programs offered by this department
  degrees: [{
    type: String,
    trim: true,
    // Examples: ["B.Sc", "M.Sc", "M.Phil", "Ph.D"]
  }],

  // The coordinator who approves submissions for this dept
  coordinator: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },

  isActive: {
    type: Boolean,
    default: true,
  },

  // Display order in newsletter
  order: {
    type: Number,
    default: 0,
  },

}, { timestamps: true });

module.exports = mongoose.model('Department', departmentSchema);
