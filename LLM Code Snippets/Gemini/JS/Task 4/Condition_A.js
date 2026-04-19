const express = require('express');
const multer = require('multer');
const path = require('path');

const app = express();
const PORT = 3000;

// --- Multer Configuration ---

// 1. Define storage settings
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Ensure this folder exists or Multer will throw an error
    cb(null, 'uploads/'); 
  },
  filename: (req, file, cb) => {
    // Generate a unique filename: timestamp + original extension
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

// 2. Initialize upload middleware
const upload = multer({ 
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 } // Optional: Limit to 5MB
});

// --- Routes ---

/**
 * Handle POST request for file upload
 * 'myFile' is the key name expected in the multipart form-data
 */
app.post('/upload', upload.single('myFile'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Please upload a file' });
    }

    // Success response
    res.status(200).json({
      message: 'File uploaded successfully',
      filename: req.file.filename,
      path: req.file.path
    });
    
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});