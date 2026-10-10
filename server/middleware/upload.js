import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { cloudinary, isCloudinaryConfigured } from '../config/cloudinary.js';

// Ensure upload directory exists
const uploadDir = './public/uploads';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer Storage Configuration
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  },
});

// File filter (images only)
const fileFilter = (req, file, cb) => {
  const filetypes = /jpeg|jpg|png|webp/;
  const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = filetypes.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error('Images only (jpeg, jpg, png, webp) are allowed!'));
  }
};

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: fileFilter,
});

// Middleware to handle Cloudinary upload if configured
export const handleImageUpload = async (req, res, next) => {
  if (!req.file) {
    return next();
  }

  try {
    if (isCloudinaryConfigured) {
      // Upload to Cloudinary
      const result = await cloudinary.uploader.upload(req.file.path, {
        folder: 'setu_complaints',
      });
      
      // Delete local temporary file
      fs.unlinkSync(req.file.path);
      
      // Attach Cloudinary URL to request body or custom field
      req.fileUrl = result.secure_url;
    } else {
      // Local URL fallback
      // Construct URL based on host
      const host = req.get('host');
      const protocol = req.protocol;
      req.fileUrl = `${protocol}://${host}/uploads/${req.file.filename}`;
    }
    next();
  } catch (error) {
    console.error('Error in image upload handler:', error);
    next(error);
  }
};

export default upload;
