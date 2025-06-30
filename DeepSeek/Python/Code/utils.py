import os
from werkzeug.utils import secure_filename
from PIL import Image
from flask import current_app

def save_profile_picture(file):
    if not file:
        return None
    
    filename = secure_filename(file.filename)
    if filename == '':
        return None
        
    # Generate a unique filename
    from datetime import datetime
    unique_filename = f"{datetime.now().timestamp()}_{filename}"
    save_path = os.path.join(current_app.config['UPLOAD_FOLDER'], unique_filename)
    
    # Resize and save the image
    try:
        img = Image.open(file)
        img.thumbnail((500, 500))
        img.save(save_path)
        return unique_filename
    except Exception as e:
        print(f"Error processing image: {e}")
        return None
