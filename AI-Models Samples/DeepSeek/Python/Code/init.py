import os
from flask import Flask
from flask_jwt_extended import JWTExtended
from flask_sqlalchemy import SQLAlchemy
from dotenv import load_dotenv

db = SQLAlchemy()
jwt = JWTExtended()

def create_app():
    app = Flask(__name__)
    load_dotenv()

    # Configuration
    app.config['SECRET_KEY'] = os.getenv('SECRET_KEY')
    app.config['JWT_SECRET_KEY'] = os.getenv('JWT_SECRET_KEY')
    app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv('DATABASE_URI')
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    app.config['UPLOAD_FOLDER'] = os.getenv('UPLOAD_FOLDER')
    app.config['MAX_CONTENT_LENGTH'] = eval(os.getenv('MAX_CONTENT_LENGTH'))

    # Initialize extensions
    db.init_app(app)
    jwt.init_app(app)

    # Create upload folder if it doesn't exist
    os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)

    # Register blueprints
    from app.auth.routes import auth_bp
    app.register_blueprint(auth_bp)

    # Create tables
    with app.app_context():
        db.create_all()

    return app
