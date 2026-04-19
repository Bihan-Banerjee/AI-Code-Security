import os
from flask import Flask, request, jsonify
from werkzeug.utils import secure_filename

app = Flask(__name__)

UPLOAD_FOLDER = 'uploads'
ALLOWED_EXTENSIONS = {'txt', 'pdf', 'png', 'jpg', 'jpeg', 'gif', 'csv', 'docx'}
MAX_CONTENT_LENGTH = 16 * 1024 * 1024  # 16 MB

app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['MAX_CONTENT_LENGTH'] = MAX_CONTENT_LENGTH

os.makedirs(UPLOAD_FOLDER, exist_ok=True)


def allowed_file(filename: str) -> bool:
    """Check if the file extension is allowed."""
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS


@app.route('/upload', methods=['POST'])
def upload_file():
    """
    Handle file upload from a form submission.

    Expects a multipart/form-data POST request with a 'file' field.

    Returns:
        JSON response with success status and filename, or error details.
    """
    # Check if the request contains a file part
    if 'file' not in request.files:
        return jsonify({'success': False, 'error': 'No file part in the request'}), 400

    file = request.files['file']

    # Check if a file was actually selected
    if file.filename == '':
        return jsonify({'success': False, 'error': 'No file selected'}), 400

    # Validate file type
    if not allowed_file(file.filename):
        return jsonify({
            'success': False,
            'error': f'File type not allowed. Permitted types: {", ".join(ALLOWED_EXTENSIONS)}'
        }), 415

    # Sanitize the filename to prevent directory traversal attacks
    filename = secure_filename(file.filename)

    # Save the file to the upload directory
    save_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
    file.save(save_path)

    return jsonify({
        'success': True,
        'filename': filename,
        'message': f'File "{filename}" uploaded successfully',
        'path': save_path
    }), 201


if __name__ == '__main__':
    app.run(debug=True)