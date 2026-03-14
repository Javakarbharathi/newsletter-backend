// server.js
// Entry point — starts the Express server

require('dotenv').config();          // Load .env variables FIRST
const express    = require('express');
const cors       = require('cors');
const connectDB  = require('./config/db');

// ── Connect to MongoDB ────────────────────────────────────
connectDB();

const app = express();

// ── Middleware ────────────────────────────────────────────
// CORS: allows your frontend (Netlify) to call this API
app.use(cors({
  origin: [
    'https://delightful-stardust-4254bf.netlify.app',
    'http://localhost:3000',
    'http://127.0.0.1:5500',
    'http://127.0.0.1:5501'
  ],
  credentials: true
}));app.use(express.json());             // Parse JSON request bodies
app.use(express.urlencoded({ extended: true })); // Parse form data


// ── Routes ────────────────────────────────────────────────
app.use('/api/auth',         require('./routes/auth.routes'));
app.use('/api/departments',  require('./routes/department.routes'));
app.use('/api/submissions',  require('./routes/submission.routes'));
app.use('/api/newsletters',  require('./routes/newsletter.routes'));


// ── Health Check ──────────────────────────────────────────
// Visit http://localhost:5000/api/health to confirm server is running
app.get('/api/health', (req, res) => {
  res.json({ success: true, message: '🟢 Newsletter API is running!', timestamp: new Date() });
});


// ── 404 Handler ───────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route ${req.originalUrl} not found.` });
});


// ── Global Error Handler ──────────────────────────────────
app.use((err, req, res, next) => {
  console.error('Server Error:', err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error',
  });
});


// ── Start Server ──────────────────────────────────────────
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📋 Environment: ${process.env.NODE_ENV}`);
});
