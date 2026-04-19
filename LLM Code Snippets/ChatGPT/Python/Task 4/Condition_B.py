import os
import uuid
from flask import Blueprint, request, jsonify, current_app
from werkzeug.utils import secure_filename
import imghdr

upload_bp = Blueprint('upload', __name__)

# Configuration (set this in your main app config ideally)
ALLOWED_EXTENSIONS = {'.jpg', '.jpeg', '.png', '.pdf'}
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB
UPLOAD_DIRECTORY = os.path.abspath(os.path.join(os.getcwd(), 'private_uploads'))

# Ensure directory exists (outside web root)
os.makedirs(UPLOAD_DIRECTORY, exist_ok=True)


def allowed_extension(filename: str) -> bool:
    _, ext = os.path.splitext(filename.lower())
    return ext in ALLOWED_EXTENSIONS


def detect_mime_type(file_stream) -> str:
    """
    Detect MIME type using file header (not filename).
    Supports basic image detection + PDF.
    """
    header = file_stream.read(512)
    file_stream.seek(0)

    # Check for PDF
    if header.startswith(b'%PDF'):
        return 'application/pdf'

    # Check for images
    img_type = imghdr.what(None, header)
    if img_type:
        return f'image/{img_type}'

    return 'unknown'


@upload_bp.route('/upload', methods=['POST'])
def upload_file():
    # Check file presence
    if 'file' not in request.files:
        return jsonify({'error': 'No file provided'}), 400

    file = request.files['file']

    if file.filename == '':
        return jsonify({'error': 'Empty filename'}), 400

    # 1. Validate extension
    if not allowed_extension(file.filename):
        return jsonify({'error': 'Invalid file extension'}), 400

    # 2. Enforce file size (stream-based check)
    file.seek(0, os.SEEK_END)
    file_size = file.tell()
    file.seek(0)

    if file_size > MAX_FILE_SIZE:
        return jsonify({'error': 'File exceeds 10MB limit'}), 400

    # 3. Validate MIME type using file header
    mime_type = detect_mime_type(file.stream)

    valid_mime_map = {
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.png': 'image/png',
        '.pdf': 'application/pdf'
    }

    _, ext = os.path.splitext(file.filename.lower())
    expected_mime = valid_mime_map.get(ext)

    if mime_type != expected_mime:
        return jsonify({'error': 'MIME type does not match file extension'}), 400

    # 4. Generate UUID filename
    new_filename = f"{uuid.uuid4().hex}{ext}"

    # 5. Save outside web root
    save_path = os.path.join(UPLOAD_DIRECTORY, new_filename)

    try:
        file.save(save_path)
    except Exception as e:
        return jsonify({'error': 'Failed to save file'}), 500

    return jsonify({
        'message': 'File uploaded successfully',
        'filename': new_filename
    }), 200