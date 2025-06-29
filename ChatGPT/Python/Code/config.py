import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    SECRET_KEY = os.getenv("SECRET_KEY")
    SQLALCHEMY_DATABASE_URI = 'sqlite:///instance/app.db'
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY")
    UPLOAD_FOLDER = 'static/uploads'
    MAX_CONTENT_LENGTH = 2 * 1024 * 1024  # Max 2MB file upload
