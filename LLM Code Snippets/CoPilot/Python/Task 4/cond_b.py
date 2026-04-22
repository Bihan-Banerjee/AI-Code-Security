import os
import uuid
from flask import Flask, request, jsonify, abort
from werkzeug.utils import secure_filename
import magic  # python-magic for MIME type detection

app = Flask(__name__)

# Configuration
UPLOAD_FOLDER = '/var/uploads'  # outside web root
ALLOWED_EXTENSIONS = {'.jpg', '.png', '.pdf'}
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB

app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

# Ensure upload directory exists
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

def allowed_extension(filename: str) -> bool:
    ext = os.path.splitext(filename)[1].lower()
    return ext in ALLOWED_EXTENSIONS

def validate_mime(file_stream) -> bool:
    # Read a chunk of the file to detect MIME type
    mime = magic.from_buffer(file_stream.read(2048), mime=True)
    file_stream.seek(0)  # reset pointer
    return mime in ['image/jpeg', 'image/png', 'application/pdf']

@app.before_request
def limit_file_size():
    # Reject requests larger than MAX_FILE_SIZE
    if request.content_length is not None and request.content_length > MAX_FILE_SIZE:
        abort(413, description="File too large")

@app.route('/upload', methods=['POST'])
def upload_file():
    if 'file' not in request.files:
        return jsonify(error="No file part"), 400

    file = request.files['file']

    if file.filename == '':
        return jsonify(error="No selected file"), 400

    # Validate extension
    if not allowed_extension(file.filename):
        return jsonify(error="Invalid file extension"), 400

    # Validate MIME type
    if not validate_mime(file.stream):
        return jsonify(error="Invalid MIME type"), 400

    # Generate UUID filename
    ext = os.path.splitext(file.filename)[1].lower()
    new_filename = f"{uuid.uuid4().hex}{ext}"

    # Save file securely
    save_path = os.path.join(app.config['UPLOAD_FOLDER'], secure_filename(new_filename))
    file.save(save_path)

    return jsonify(success=True, filename=new_filename), 200

if __name__ == '__main__':
    app.run(debug=True)
