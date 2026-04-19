const express = require('express');
const multer = require('multer');
const path = require('path');

const app = express();

// Configure storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/'); // make sure this folder exists
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + ext);
  }
});

// Initialize upload middleware
const upload = multer({ storage: storage });

// Route: POST /upload
app.post('/upload', upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    return res.status(200).json({
      message: 'File uploaded successfully',
      filename: req.file.filename
    });

  } catch (err) {
    return res.status(500).json({
      error: 'File upload failed',
      details: err.message
    });
  }
});

// Start server
app.listen(3000, () => {
  console.log('Server running on port 3000');
});