const express = require('express');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const fs = require('fs');

const app = express();

// Configuration
const UPLOAD_DIR = path.join(__dirname, 'uploads_private'); // Outside static serving
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

// Allowed file types - extension and mimetype pairs
const ALLOWED_FILE_TYPES = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'application/pdf': '.pdf'
};

// Ensure upload directory exists
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// Configure multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOAD_DIR);
  },
  filename: (req, file, cb) => {
    // Generate UUID-based filename, discard original name entirely
    const uuid = uuidv4();
    const extension = path.extname(file.originalname);
    cb(null, `${uuid}${extension}`);
  }
});

// File filter function - validates both mimetype and extension
const fileFilter = (req, file, cb) => {
  // Check if mimetype is allowed
  const isMimeAllowed = Object.keys(ALLOWED_FILE_TYPES).includes(file.mimetype);
  
  if (!isMimeAllowed) {
    return cb(new Error(`Invalid file type. Only ${Object.values(ALLOWED_FILE_TYPES).join(', ')} files are allowed.`), false);
  }
  
  // Get expected extension from mimetype
  const expectedExtension = ALLOWED_FILE_TYPES[file.mimetype];
  
  // Check if file extension matches the mimetype
  const fileExtension = path.extname(file.originalname).toLowerCase();
  const isExtensionValid = fileExtension === expectedExtension;
  
  if (!isExtensionValid) {
    return cb(new Error(`File extension does not match MIME type. Expected ${expectedExtension} for ${file.mimetype}`), false);
  }
  
  // All validations passed
  cb(null, true);
};

// Configure multer
const upload = multer({
  storage: storage,
  limits: {
    fileSize: MAX_FILE_SIZE
  },
  fileFilter: fileFilter
});

// Route handler for file upload
app.post('/upload', (req, res) => {
  // Use multer single file middleware (assuming field name is 'file')
  const uploadSingle = upload.single('file');
  
  uploadSingle(req, res, (err) => {
    // Handle multer-specific errors
    if (err instanceof multer.MulterError) {
      if (err.code === 'FILE_TOO_LARGE') {
        return res.status(400).json({
          error: `File too large. Maximum size is ${MAX_FILE_SIZE / (1024 * 1024)}MB`
        });
      }
      return res.status(400).json({ error: err.message });
    } else if (err) {
      // Handle custom file filter errors
      return res.status(400).json({ error: err.message });
    }
    
    // Check if file was uploaded
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    
    // Return JSON response with generated filename
    res.status(200).json({
      message: 'File uploaded successfully',
      filename: req.file.filename,
      originalName: req.file.originalname,
      size: req.file.size,
      mimetype: req.file.mimetype
    });
  });
});

// Optional: Multiple file upload endpoint
app.post('/upload-multiple', (req, res) => {
  const uploadMultiple = upload.array('files', 5); // Max 5 files
  
  uploadMultiple(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'FILE_TOO_LARGE') {
        return res.status(400).json({
          error: `File too large. Maximum size is ${MAX_FILE_SIZE / (1024 * 1024)}MB`
        });
      }
      return res.status(400).json({ error: err.message });
    } else if (err) {
      return res.status(400).json({ error: err.message });
    }
    
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded' });
    }
    
    const uploadedFiles = req.files.map(file => ({
      filename: file.filename,
      originalName: file.originalname,
      size: file.size,
      mimetype: file.mimetype
    }));
    
    res.status(200).json({
      message: `${req.files.length} file(s) uploaded successfully`,
      files: uploadedFiles
    });
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', uploadDir: UPLOAD_DIR });
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Upload directory: ${UPLOAD_DIR}`);
  console.log(`Max file size: ${MAX_FILE_SIZE / (1024 * 1024)}MB`);
  console.log(`Allowed types: ${Object.keys(ALLOWED_FILE_TYPES).join(', ')}`);
});

module.exports = app;