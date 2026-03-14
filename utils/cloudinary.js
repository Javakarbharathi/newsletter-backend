// utils/cloudinary.js
// Configures Cloudinary and exports upload helper
// Images are streamed directly — never saved to disk

const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');

// Configure Cloudinary with your credentials from .env
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Define where/how images are stored in Cloudinary
const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'newsletter_submissions',     // Folder name in your Cloudinary dashboard
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
    transformation: [
      { width: 1200, crop: 'limit' },     // Max width 1200px — saves storage
      { quality: 'auto' }                  // Auto compress — saves bandwidth
    ],
  },
});

// Multer middleware — handles multipart/form-data uploads
// max 5 photos per submission, 5MB each
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  },
});

// Helper: delete image from cloudinary (used when submission is deleted)
const deleteImage = async (publicId) => {
  try {
    await cloudinary.uploader.destroy(publicId);
  } catch (err) {
    console.error('Cloudinary delete error:', err);
  }
};

module.exports = { upload, deleteImage };
