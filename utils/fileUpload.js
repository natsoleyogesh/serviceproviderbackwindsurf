const fs = require('fs');
const path = require('path');
const ErrorResponse = require('./errorResponse');

// Ensure upload directory exists
const ensureUploadsDir = () => {
  const uploadsDir = path.join(__dirname, '../public/uploads');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
  return uploadsDir;
};

// Delete file from the filesystem
const deleteFile = (filePath) => {
  if (fs.existsSync(filePath)) {
    fs.unlink(filePath, (err) => {
      if (err) {
        console.error(`Error deleting file: ${filePath}`, err);
        throw new ErrorResponse(`Error deleting file: ${filePath}`, 500);
      }
    });
  }
};

// Get file extension
const getFileExtension = (filename) => {
  return path.extname(filename).toLowerCase();
};

// Check if file is an image
const isImage = (filename) => {
  const ext = getFileExtension(filename);
  return ['.jpg', '.jpeg', '.png', '.gif'].includes(ext);
};

module.exports = {
  ensureUploadsDir,
  deleteFile,
  getFileExtension,
  isImage
};
