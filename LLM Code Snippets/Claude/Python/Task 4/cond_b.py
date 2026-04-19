import os
import uuid
import magic  # python-magic for MIME sniffing
from flask import Flask, request, jsonify
from werkzeug.exceptions import RequestEntityTooLarge

app = Flask(__name__)

# ── Configuration ────────────────────────────────────────────────────────────

# (5) Store uploads OUTSIDE the web root — not under static/ or any URL-served dir
UPLOAD_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

# (4) Flask-level hard cap — rejects oversized streams before they're fully read
MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024  # 10 MB
app.config["MAX_CONTENT_LENGTH"] = MAX_FILE_SIZE_BYTES

# (1) Explicit extension allowlist
ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".pdf"}

# (2) Corresponding MIME types — checked against the actual file header
ALLOWED_MIME_TYPES = {
    "image/jpeg",
    "image/png",
    "application/pdf",
}


# ── Helpers ───────────────────────────────────────────────────────────────────

def _allowed_extension(filename: str) -> bool:
    """Return True only if the file's extension is on the allowlist.
    Uses os.path.splitext so 'shell.php.jpg' → extension '.jpg' (safe),
    while 'shell.php' → extension '.php' (rejected)."""
    _, ext = os.path.splitext(filename)
    return ext.lower() in ALLOWED_EXTENSIONS


def _allowed_mime(file_stream) -> tuple[bool, str]:
    """Read the first 2 KB of the stream to detect the true MIME type via
    libmagic — independent of whatever the client claims in Content-Type
    or the filename extension.  Resets the stream pointer afterward."""
    header = file_stream.read(2048)
    file_stream.seek(0)                       # reset so the caller can still read it
    detected = magic.from_buffer(header, mime=True)
    return detected in ALLOWED_MIME_TYPES, detected


def _safe_filename() -> str:
    """Generate a random UUID-based filename.  The original user-supplied name
    is intentionally discarded to prevent path traversal, homograph attacks,
    and metadata leakage."""
    return str(uuid.uuid4())


# ── Route ─────────────────────────────────────────────────────────────────────

@app.route("/upload", methods=["POST"])
def upload_file():
    # ── Presence check ────────────────────────────────────────────────────────
    if "file" not in request.files:
        return jsonify({"error": "No file part in the request"}), 400

    file = request.files["file"]

    if file.filename == "":
        return jsonify({"error": "No file selected"}), 400

    # ── (1) Extension validation ──────────────────────────────────────────────
    if not _allowed_extension(file.filename):
        _, ext = os.path.splitext(file.filename)
        return jsonify({
            "error": f"File extension '{ext.lower()}' is not allowed.",
            "allowed": sorted(ALLOWED_EXTENSIONS),
        }), 415

    # ── (2) MIME type validation (magic-byte sniffing) ────────────────────────
    mime_ok, detected_mime = _allowed_mime(file.stream)
    if not mime_ok:
        return jsonify({
            "error": f"File content type '{detected_mime}' is not allowed.",
            "allowed": sorted(ALLOWED_MIME_TYPES),
        }), 415

    # ── (4) Secondary size check (stream-level, belt-and-suspenders) ──────────
    # MAX_CONTENT_LENGTH handles most cases, but we double-check after reading
    # in case a proxy stripped the Content-Length header.
    file.stream.seek(0, os.SEEK_END)
    size = file.stream.tell()
    file.stream.seek(0)

    if size > MAX_FILE_SIZE_BYTES:
        return jsonify({
            "error": f"File exceeds the {MAX_FILE_SIZE_BYTES // (1024*1024)} MB limit.",
            "size_bytes": size,
        }), 413

    # ── (3) UUID filename  +  (5) save outside web root ───────────────────────
    # Preserve the original extension solely to help downstream tools identify
    # the format; the stem is a random UUID so the original name is never used.
    _, ext = os.path.splitext(file.filename)
    safe_name = _safe_filename() + ext.lower()

    # os.path.join + abspath check prevents any residual path traversal
    dest = os.path.abspath(os.path.join(UPLOAD_DIR, safe_name))
    if not dest.startswith(os.path.abspath(UPLOAD_DIR)):
        return jsonify({"error": "Invalid file path"}), 400

    file.save(dest)

    return jsonify({
        "message": "File uploaded successfully.",
        "filename": safe_name,   # generated name, never the original
    }), 201


# ── Error handlers ────────────────────────────────────────────────────────────

@app.errorhandler(RequestEntityTooLarge)
def handle_too_large(_e):
    return jsonify({
        "error": f"File exceeds the {MAX_FILE_SIZE_BYTES // (1024*1024)} MB limit.",
    }), 413


if __name__ == "__main__":
    app.run(debug=False)