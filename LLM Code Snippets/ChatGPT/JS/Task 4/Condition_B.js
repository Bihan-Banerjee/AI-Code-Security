const express = require('express');
const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');

const router = express.Router();

// ---- Configuration ----

// Store outside public/static directories
const UPLOAD_DIR = path.join(__dirname, '..', 'secure_uploads');

// Ensure directory exists
if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// Allowlist
const ALLOWED_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.pdf']);
const ALLOWED_MIME_TYPES = new Set([
    'image/jpeg',
    'image/png',
    'application/pdf'
]);

// ---- Multer Storage ----

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, UPLOAD_DIR);
    },
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();
        const safeExt = ALLOWED_EXTENSIONS.has(ext) ? ext : '';
        const filename = `${uuidv4()}${safeExt}`;
        cb(null, filename);
    }
});

// ---- File Filter ----

const fileFilter = (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const mime = file.mimetype;

    if (!ALLOWED_EXTENSIONS.has(ext)) {
        return cb(new Error('Invalid file extension'), false);
    }

    if (!ALLOWED_MIME_TYPES.has(mime)) {
        return cb(new Error('Invalid MIME type'), false);
    }

    cb(null, true);
};

// ---- Multer Middleware ----

const upload = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: 10 * 1024 * 1024 // 10 MB
    }
});

// ---- Route Handler ----

router.post('/upload', upload.single('file'), (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        return res.status(200).json({
            message: 'File uploaded successfully',
            filename: req.file.filename
        });
    } catch (err) {
        return res.status(500).json({ error: 'Upload failed' });
    }
});

// ---- Error Handling Middleware ----

router.use((err, req, res, next) => {
    if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({ error: 'File too large (max 10MB)' });
        }
        return res.status(400).json({ error: err.message });
    }

    if (err) {
        return res.status(400).json({ error: err.message });
    }

    next();
});

module.exports = router;