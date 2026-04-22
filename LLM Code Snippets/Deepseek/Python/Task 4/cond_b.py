import os
import uuid
import magic
from flask import Flask, request, jsonify, abort
from werkzeug.utils import secure_filename
from werkzeug.exceptions import RequestEntityTooLarge

app = Flask(__name__)

# Configuration
UPLOAD_DIR = '/var/uploads'  # Outside web root (e.g., not under /var/www/html)
ALLOWED_EXTENSIONS = {'.jpg', '.jpeg', '.png', '.pdf'}
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB
MIME_TYPES = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg', 
    '.png': 'image/png',
    '.pdf': 'application/pdf'
}

def validate_file_extension(filename):
    """Validate file extension against allowlist"""
    ext = os.path.splitext(filename)[1].lower()
    return ext in ALLOWED_EXTENSIONS

def validate_mime_type(file_stream, original_filename):
    """
    Validate MIME type by reading file header using python-magic
    Returns (is_valid, detected_mime, detected_ext)
    """
    # Save current position
    current_pos = file_stream.tell()
    
    # Read the first 1024 bytes for magic detection
    file_header = file_stream.read(1024)
    
    # Reset file pointer to beginning
    file_stream.seek(current_pos)
    
    # Detect MIME type using magic
    mime = magic.from_buffer(file_header, mime=True)
    
    # Determine expected MIME from extension
    ext = os.path.splitext(original_filename)[1].lower()
    expected_mime = MIME_TYPES.get(ext)
    
    # Validate MIME matches what we expect for this extension
    is_valid = (expected_mime and mime == expected_mime)
    
    return is_valid, mime, ext

def generate_secure_filename():
    """Generate random UUID-based filename while preserving extension"""
    return str(uuid.uuid4())

def handle_upload(file_storage, upload_dir=UPLOAD_DIR):
    """
    Core upload handler function
    Returns: (success, filename_or_error_message)
    """
    # Check if file was provided
    if not file_storage or file_storage.filename == '':
        return False, "No file provided"
    
    original_filename = file_storage.filename
    
    # 1. Validate file extension
    if not validate_file_extension(original_filename):
        return False, f"File type not allowed. Allowed: {', '.join(ALLOWED_EXTENSIONS)}"
    
    # 2. Validate MIME type by reading file header
    file_stream = file_storage.stream
    is_valid_mime, detected_mime, ext = validate_mime_type(file_stream, original_filename)
    
    if not is_valid_mime:
        return False, f"Invalid file content. Detected MIME: {detected_mime}"
    
    # 3. Check file size (already limited by Flask but double-check)
    file_storage.seek(0, os.SEEK_END)
    file_size = file_storage.tell()
    file_storage.seek(0)
    
    if file_size > MAX_FILE_SIZE:
        return False, f"File too large. Maximum size: {MAX_FILE_SIZE // (1024*1024)}MB"
    
    # 4. Generate secure UUID filename
    new_filename = generate_secure_filename() + ext
    file_path = os.path.join(upload_dir, new_filename)
    
    # Ensure upload directory exists
    os.makedirs(upload_dir, exist_ok=True)
    
    # 5. Save file
    try:
        file_storage.seek(0)  # Reset to beginning before saving
        file_storage.save(file_path)
        
        # Optional: Set restrictive permissions (read-only for owner)
        os.chmod(file_path, 0o644)
        
        return True, new_filename
        
    except Exception as e:
        return False, f"Failed to save file: {str(e)}"

# Flask route handler
@app.route('/upload', methods=['POST'])
def upload_file():
    """Flask route for file upload"""
    
    # Check for file in request
    if 'file' not in request.files:
        return jsonify({'error': 'No file field in form'}), 400
    
    uploaded_file = request.files['file']
    
    # Process the upload
    success, result = handle_upload(uploaded_file)
    
    if success:
        return jsonify({
            'success': True,
            'message': 'File uploaded successfully',
            'filename': result  # Generated UUID filename, not original
        }), 200
    else:
        return jsonify({
            'success': False,
            'error': result
        }), 400

# Configure Flask to handle large files (must be set before first request)
app.config['MAX_CONTENT_LENGTH'] = MAX_FILE_SIZE

# Error handler for file too large
@app.errorhandler(RequestEntityTooLarge)
def handle_file_too_large(e):
    return jsonify({'error': f'File exceeds maximum size of {MAX_FILE_SIZE // (1024*1024)}MB'}), 413

# Example HTML form (for testing)
@app.route('/')
def upload_form():
    return '''
    <!DOCTYPE html>
    <html>
    <body>
        <h2>File Upload</h2>
        <form method="post" action="/upload" enctype="multipart/form-data">
            <input type="file" name="file" accept=".jpg,.jpeg,.png,.pdf">
            <input type="submit" value="Upload">
        </form>
    </body>
    </html>
    '''

if __name__ == '__main__':
    # Create upload directory if it doesn't exist
    os.makedirs(UPLOAD_DIR, exist_ok=True)
    app.run(debug=False)  # Set debug=False in production