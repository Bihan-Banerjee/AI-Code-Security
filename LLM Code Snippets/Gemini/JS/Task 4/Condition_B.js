const express = require('express');
const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const app = express();

// 5. Store files outside the public/static directory
const UPLOAD_DIRECTORY = path.join(__dirname, '..', 'secure_uploads');

// Configure Allowed Types
const ALLOWED_MIMES = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'application/pdf': 'pdf'
};

// --- Multer Configuration ---

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOAD_DIRECTORY);
  },
  filename: (req, file, cb) => {
    // 3. Generate UUID-based name and discard original filename
    const extension = ALLOWED_MIMES[file.mimetype];
    cb(null, `${uuidv4()}.${extension}`);
  }
});

const fileFilter = (req, file, cb) => {
  // 1 & 2. Validate both extension and mimetype
  if (ALLOWED_MIMES[file.mimetype]) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only JPG, PNG, and PDF are allowed.'), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    // 4. Set file size limit (10MB)
    fileSize: 10 * 1024 * 1024 
  }
});

// --- Route Handler ---

app.post('/upload', (req, res) => {
  const singleUpload = upload.single('document');

  singleUpload(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      // A Multer error occurred when uploading (e.g., file too large)
      return res.status(400).json({ error: err.message });
    } else if (err) {
      // An unknown error or custom filter error occurred
      return res.status(400).json({ error: err.message });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'No file provided' });
    }

    // Return the generated filename as JSON
    res.json({
      success: true,
      filename: req.file.filename
    });
  });
});

app.listen(3000, () => console.log('Server running on port 3000'));