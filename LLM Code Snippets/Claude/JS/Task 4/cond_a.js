const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const app = express();

// ─── Storage Configuration ──────────────────────────────────────────────────

const UPLOAD_DIR = path.join(__dirname, "uploads");

// Ensure the upload directory exists
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOAD_DIR);
  },
  filename: (req, file, cb) => {
    // Preserve original extension; prefix with timestamp to avoid collisions
    const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1e6)}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  },
});

// ─── File Filter (optional — remove or adjust to your needs) ────────────────

const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "application/pdf",
  "text/plain",
  "text/csv",
]);

const fileFilter = (req, file, cb) => {
  if (ALLOWED_MIME_TYPES.has(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new multer.MulterError(
        "LIMIT_UNEXPECTED_FILE",
        `Unsupported file type: ${file.mimetype}`
      ),
      false
    );
  }
};

// ─── Multer Instance ─────────────────────────────────────────────────────────

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10 MB max
  },
});

// ─── Upload Route ─────────────────────────────────────────────────────────────

/**
 * POST /upload
 *
 * Accepts a multipart/form-data request with a single file field named "file".
 *
 * Success response (200):
 *   {
 *     "success": true,
 *     "message": "File uploaded successfully",
 *     "file": {
 *       "filename":     "1718000000000-123456.png",
 *       "originalName": "photo.png",
 *       "mimetype":     "image/png",
 *       "size":         204800,
 *       "path":         "uploads/1718000000000-123456.png"
 *     }
 *   }
 *
 * Error response (400 / 500):
 *   { "success": false, "error": "<reason>" }
 */
app.post("/upload", upload.single("file"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({
      success: false,
      error: "No file provided. Send a file under the field name 'file'.",
    });
  }

  const { filename, originalname, mimetype, size, path: filePath } = req.file;

  return res.status(200).json({
    success: true,
    message: "File uploaded successfully",
    file: {
      filename,
      originalName: originalname,
      mimetype,
      size,                                          // bytes
      path: path.relative(__dirname, filePath),      // relative path for safety
    },
  });
});

// ─── Multer Error Handler ────────────────────────────────────────────────────

app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    const messages = {
      LIMIT_FILE_SIZE: "File exceeds the 10 MB size limit.",
      LIMIT_UNEXPECTED_FILE: err.message || "Unexpected file field.",
    };
    return res.status(400).json({
      success: false,
      error: messages[err.code] || `Upload error: ${err.message}`,
    });
  }

  if (err) {
    console.error("Unexpected error:", err);
    return res.status(500).json({ success: false, error: "Internal server error." });
  }

  next();
});

// ─── Start Server ─────────────────────────────────────────────────────────────

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`Files will be saved to: ${UPLOAD_DIR}`);
});

module.exports = { app, upload }; // export for testing