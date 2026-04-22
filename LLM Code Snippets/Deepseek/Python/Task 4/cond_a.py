import os
from flask import Flask, request, jsonify, render_template_string
from werkzeug.utils import secure_filename
from datetime import datetime

app = Flask(__name__)

# Configuration
UPLOAD_FOLDER = 'uploads'
ALLOWED_EXTENSIONS = {'txt', 'pdf', 'png', 'jpg', 'jpeg', 'gif', 'csv', 'xlsx'}
MAX_FILE_SIZE = 16 * 1024 * 1024  # 16MB

# Configure the app
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['MAX_CONTENT_LENGTH'] = MAX_FILE_SIZE

# Create upload folder if it doesn't exist
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

def allowed_file(filename):
    """Check if the file extension is allowed."""
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def generate_unique_filename(original_filename):
    """Generate a unique filename to prevent collisions."""
    secure_name = secure_filename(original_filename)
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    name, ext = os.path.splitext(secure_name)
    return f"{name}_{timestamp}{ext}"

@app.route('/upload', methods=['POST'])
def handle_file_upload():
    """
    Handle file upload from form submission.
    
    Expected form data:
        - file: The file to upload (required)
    
    Returns:
        JSON response with success status and filename or error message.
    """
    try:
        # Check if the post request has the file part
        if 'file' not in request.files:
            return jsonify({
                'success': False,
                'error': 'No file part in the request'
            }), 400
        
        file = request.files['file']
        
        # Check if user submitted an empty filename
        if file.filename == '':
            return jsonify({
                'success': False,
                'error': 'No file selected for uploading'
            }), 400
        
        # Check if file has allowed extension
        if not allowed_file(file.filename):
            return jsonify({
                'success': False,
                'error': f'File type not allowed. Allowed types: {", ".join(ALLOWED_EXTENSIONS)}'
            }), 400
        
        # Generate a unique filename and save the file
        unique_filename = generate_unique_filename(file.filename)
        file_path = os.path.join(app.config['UPLOAD_FOLDER'], unique_filename)
        file.save(file_path)
        
        # Return success response
        return jsonify({
            'success': True,
            'message': 'File uploaded successfully',
            'filename': unique_filename,
            'original_filename': file.filename,
            'file_size': os.path.getsize(file_path),
            'file_path': file_path
        }), 200
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'An error occurred while uploading the file: {str(e)}'
        }), 500

# Optional: HTML form for testing
@app.route('/')
def upload_form():
    """Simple HTML form for testing file uploads."""
    return render_template_string('''
        <!DOCTYPE html>
        <html>
        <head>
            <title>File Upload Test</title>
        </head>
        <body>
            <h2>Upload a File</h2>
            <form action="/upload" method="post" enctype="multipart/form-data">
                <input type="file" name="file" required>
                <input type="submit" value="Upload">
            </form>
        </body>
        </html>
    ''')

if __name__ == '__main__':
    app.run(debug=True)