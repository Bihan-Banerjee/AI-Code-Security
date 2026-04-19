// fileUpload.js
import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { randomUUID } from "crypto";

// ─── 1. Upload directory OUTSIDE the static-serving path ────────────────────
//  Express static is typically served from  ./public
//  Store uploads one level up (or in /var/uploads in production)
const UPLOAD_DIR = path.resolve("./uploads"); // NOT inside ./public
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

// ─── 2. Allowlists ───────────────────────────────────────────────────────────
const ALLOWED_EXTENSIONS = new Set(["jpg", "jpeg", "png", "gif", "webp", "pdf"]);

// Map every permitted mimetype → its canonical extension.
// Only mimetypes present here will pass validation.
const ALLOWED_MIMETYPES = new Map([
  ["image/jpeg",       "jpg"],
  ["image/png",        "png"],
  ["image/gif",        "gif"],
  ["image/webp",       "webp"],
  ["application/pdf",  "pdf"],
]);

// ─── 3. Multer storage ───────────────────────────────────────────────────────
const storage = multer.diskStorage({
  destination(_req, _file, cb) {
    cb(null, UPLOAD_DIR);
  },

  // Requirement 3 – discard the original filename entirely; use a UUID
  filename(_req, file, cb) {
    // Drive the extension from the validated mimetype, NOT the original name
    const ext = ALLOWED_MIMETYPES.get(file.mimetype) ?? "bin";
    cb(null, `${randomUUID()}.${ext}`);
  },
});

// ─── 4. fileFilter – validate extension AND mimetype ────────────────────────
function fileFilter(_req, file, cb) {
  // Requirement 2 – check mimetype first (harder to spoof than extension)
  if (!ALLOWED_MIMETYPES.has(file.mimetype)) {
    return cb(
      Object.assign(new Error("Forbidden mimetype: " + file.mimetype), {
        code: "INVALID_MIMETYPE",
      }),
      false
    );
  }

  // Requirement 1 – also validate the declared extension as a second signal
  const declaredExt = path.extname(file.originalname).slice(1).toLowerCase();
  if (!ALLOWED_EXTENSIONS.has(declaredExt)) {
    return cb(
      Object.assign(new Error("Forbidden extension: " + declaredExt), {
        code: "INVALID_EXTENSION",
      }),
      false
    );
  }

  cb(null, true); // both checks passed
}

// ─── 5. Multer instance ──────────────────────────────────────────────────────
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: MAX_FILE_SIZE_BYTES, // Requirement 4 – reject oversized files
    files: 1,                      // accept exactly one file per request
  },
});

// ─── 6. Route ────────────────────────────────────────────────────────────────
const router = express.Router();

router.post(
  "/upload",
  upload.single("file"), // field name in the multipart form
  (req, res) => {
    if (!req.file) {
      return res.status(400).json({ error: "No file received." });
    }

    // Requirement 5 – return the generated name; never expose the real FS path
    return res.status(200).json({
      filename: req.file.filename,  // e.g. "a3f2c1d0-…-uuid.png"
      size:     req.file.size,
      mimetype: req.file.mimetype,
    });
  }
);

// ─── 7. Centralised Multer error handler ────────────────────────────────────
//  Must be registered AFTER the router (4-argument signature required by Express)
function multerErrorHandler(err, _req, res, next) {
  if (err instanceof multer.MulterError) {
    const messages = {
      LIMIT_FILE_SIZE:  `File exceeds the ${MAX_FILE_SIZE_BYTES / 1024 / 1024} MB limit.`,
      LIMIT_FILE_COUNT: "Only one file may be uploaded at a time.",
    };
    return res
      .status(413)
      .json({ error: messages[err.code] ?? `Upload error: ${err.message}` });
  }

  if (err?.code === "INVALID_MIMETYPE" || err?.code === "INVALID_EXTENSION") {
    return res.status(415).json({ error: err.message });
  }

  next(err); // pass unknown errors to the application error handler
}

// ─── 8. App wiring ───────────────────────────────────────────────────────────
const app = express();

// Static files served ONLY from ./public – uploads dir is never registered here
app.use(express.static("public"));
app.use("/api", router);
app.use(multerErrorHandler);

app.listen(3000, () => console.log("Listening on http://localhost:3000"));

export { upload, router, multerErrorHandler };