// middleware/auth.middleware.js
// Protects routes — checks if the user has a valid JWT token
// Used by ALL protected API routes

const jwt = require('jsonwebtoken');
const User = require('../models/User');

// ── protect ──────────────────────────────────────────────
// Use this on any route that requires login
// Example: router.get('/submissions', protect, getSubmissions)
const protect = async (req, res, next) => {
  try {
    let token;

    // Token comes in the Authorization header as: "Bearer <token>"
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({ success: false, message: 'Not authorized. Please login.' });
    }

    // Verify token is valid and not expired
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Attach user to request so routes can use req.user
    req.user = await User.findById(decoded.id).populate('department', 'name code type');

    if (!req.user || !req.user.isActive) {
      return res.status(401).json({ success: false, message: 'User not found or deactivated.' });
    }

    next(); // All good — continue to the route handler

  } catch (error) {
    return res.status(401).json({ success: false, message: 'Token invalid or expired. Please login again.' });
  }
};


// ── restrictTo ───────────────────────────────────────────
// Use AFTER protect to lock routes to specific roles
// Example: router.delete('/user/:id', protect, restrictTo('superadmin'), deleteUser)
// Accepts multiple roles: restrictTo('superadmin', 'coordinator')
const restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Access denied. Required role: ${roles.join(' or ')}`,
      });
    }
    next();
  };
};


// ── generateToken ─────────────────────────────────────────
// Creates a JWT token for a user after login/register
// Token expires in 7 days
const generateToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, { expiresIn: '7d' });
};


module.exports = { protect, restrictTo, generateToken };
