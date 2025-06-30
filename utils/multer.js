const multer = require('multer');
const path = require('path');
const fs = require('fs');
const AppError = require('./appError');

// Ensure upload directory exists
const uploadDir = path.join(__dirname, '../public/uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure multer storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    // Create unique filename
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, `doc-${uniqueSuffix}${ext}`);
  },
});

// File filter function
const fileFilter = (req, file, cb) => {
  // Accept images and PDFs
  const filetypes = /jpeg|jpg|png|pdf/;
  const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = filetypes.test(file.mimetype);

  if (extname && mimetype) {
    return cb(null, true);
  } else {
    cb(
      new AppError(
        'Error: Only image files (jpeg, jpg, png) and PDFs are allowed!',
        400
      ),
      false
    );
  }
};

// Initialize upload
const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: fileFilter,
});

// Middleware for handling single file upload
const uploadSingle = (fieldName) => {
  return (req, res, next) => {
    upload.single(fieldName)(req, res, function (err) {
      if (err instanceof multer.MulterError) {
        // A Multer error occurred when uploading
        return next(new AppError(`File upload error: ${err.message}`, 400));
      } else if (err) {
        // An unknown error occurred
        return next(err);
      }
      next();
    });
  };
};

// Middleware for handling multiple file uploads
const uploadMultiple = (fieldName, maxCount = 5) => {
  return (req, res, next) => {
    upload.array(fieldName, maxCount)(req, res, function (err) {
      if (err instanceof multer.MulterError) {
        // A Multer error occurred when uploading
        return next(new AppError(`File upload error: ${err.message}`, 400));
      } else if (err) {
        // An unknown error occurred
        return next(err);
      }
      next();
    });
  };
};

// Middleware for handling document uploads with specific field names
const uploadDocument = (fieldName) => {
  return (req, res, next) => {
    upload.single(fieldName)(req, res, function (err) {
      if (err instanceof multer.MulterError) {
        return next(new AppError(`Document upload error: ${err.message}`, 400));
      } else if (err) {
        return next(err);
      }
      
      // If file was uploaded, add the path to the request body for the controller
      if (req.file) {
        req.body.documentUrl = `/uploads/${req.file.filename}`;
      }
      
      next();
    });
  };
};

module.exports = {
  upload,
  uploadSingle,
  uploadMultiple,
  uploadDocument,
};
