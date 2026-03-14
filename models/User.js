// models/User.js
// Defines the structure of a User in the database

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({

  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
  },

  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,          // No duplicate emails
    lowercase: true,
    trim: true,
  },

  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: 6,
    select: false,         // Never return password in queries by default
  },

  // Role controls what this user can do
  role: {
    type: String,
    enum: ['superadmin', 'coordinator', 'staff', 'viewer'],
    default: 'staff',
  },

  // Which department this user belongs to
  department: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Department',
    required: function() {
      // superadmin doesn't need a department
      return this.role !== 'superadmin';
    },
  },

  isActive: {
    type: Boolean,
    default: true,
  },

}, { timestamps: true }); // Adds createdAt and updatedAt automatically


// MIDDLEWARE: Hash password before saving to DB
// This runs automatically before every .save()
userSchema.pre('save', async function(next) {
  // Only hash if password was changed (not on every update)
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// METHOD: Compare entered password with hashed password
// Usage: const isMatch = await user.comparePassword(enteredPassword)
userSchema.methods.comparePassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
