// server.js
require('dotenv').config();
const express   = require('express');
const cors      = require('cors');
const connectDB = require('./config/db');

connectDB();

const app = express();

// ── CORS — allow all methods including OPTIONS preflight ──
const corsOptions = {
  origin: [
    'https://delightful-stardust-4254bf.netlify.app',
    'http://localhost:3000',
    'http://127.0.0.1:5500',
    'http://127.0.0.1:5501',
    'http://localhost:5500',
    'http://localhost:5501',
  ],
  methods: ['GET','POST','PUT','PATCH','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization'],
  credentials: true,
};
app.use(cors(corsOptions));
app.options('*', cors(corsOptions)); // Handle preflight for ALL routes

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── Routes ──
app.use('/api/auth',        require('./routes/auth.routes'));
app.use('/api/departments', require('./routes/department.routes'));
app.use('/api/submissions', require('./routes/submission.routes'));
app.use('/api/newsletters', require('./routes/newsletter.routes'));

// ── Health ──
app.get('/api/health', (req, res) => {
  res.json({ success: true, message: '🟢 Newsletter API is running!', timestamp: new Date() });
});

// ── 404 ──
app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route ${req.originalUrl} not found.` });
});

// ── Error Handler ──
app.use((err, req, res, next) => {
  console.error('Server Error:', err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error',
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📋 Environment: ${process.env.NODE_ENV}`);
});
