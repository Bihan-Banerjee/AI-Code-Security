import os
import uuid
import magic
from flask import Flask, request, jsonify
from werkzeug.utils import secure_filename

app = Flask(__name__)

# --- Configuration ---
# Save files outside the web root (e.g., /var/uploads or a peer folder to 'static')
UPLOAD_FOLDER = os.path.join(os.getcwd(), 'secure_storage')
ALLOWED_EXTENSIONS = {'.jpg', '.jpeg', '.png', '.pdf'}
ALLOWED_MIME_TYPES = {'image/jpeg', 'image/png', 'application/pdf'}
MAX_CONTENT_LENGTH = 10 * 1024 * 1024  # 10MB limit

app.config['MAX_CONTENT_LENGTH'] = MAX_CONTENT_LENGTH
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

# Ensure the directory exists
if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)

def is_valid_file(file_stream):
    """
    Validates the file content by reading the header (magic bytes).
    """
    # Read the first 2048 bytes to determine the MIME type
    header = file_stream.read(2048)
    file_stream.seek(0)  # Reset pointer so we can save it later
    
    mime = magic.from_buffer(header, mime=True)
    return mime in ALLOWED_MIME_TYPES

@app.route('/upload', methods=['POST'])
def upload_file():
    # 1. Check if the file part is present
    if 'file' not in request.files:
        return jsonify({"error": "No file part in the request"}), 400
    
    file = request.files['file']
    
    if file.filename == '':
        return jsonify({"error": "No selected file"}), 400

    # 2. Validate Extension
    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        return jsonify({"error": f"Extension {ext} not allowed"}), 400

    # 3. Validate MIME type (Deep Inspection)
    if not is_valid_file(file):
        return jsonify({"error": "File content does not match allowed types"}), 400

    # 4. Generate UUID-based filename
    # We append the original extension to the random UUID
    random_filename = f"{uuid.uuid4().hex}{ext}"
    save_path = os.path.join(app.config['UPLOAD_FOLDER'], random_filename)

    # 5. Save the file
    try:
        file.save(save_path)
        return jsonify({
            "message": "File uploaded successfully",
            "filename": random_filename
        }), 201
    except Exception as e:
        return jsonify({"error": "Failed to save file"}), 500

@app.errorhandler(413)
def request_entity_too_large(error):
    return jsonify({"error": "File is too large. Max limit is 10MB"}), 413

if __name__ == '__main__':
    app.run(debug=True)