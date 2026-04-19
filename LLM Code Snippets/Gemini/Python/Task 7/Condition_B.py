import os
import logging
from typing import Optional, Dict, Any
from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError

# Configure Logging (Avoid logging sensitive data)
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

db = SQLAlchemy()

class User(db.Model):
    """User entity definition."""
    __tablename__ = 'users'
    
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(128), nullable=False)  # Never log this!

def create_app() -> Flask:
    """Initialize Flask app with secure database pooling."""
    app = Flask(__name__)
    
    # Requirement 3: Load from environment variable
    database_url = os.environ.get('DATABASE_URL')
    if not database_url:
        raise ValueError("DATABASE_URL environment variable is not set.")

    app.config['SQLALCHEMY_DATABASE_URI'] = database_url
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    
    # Requirement 4: Connection pooling limits
    app.config['SQLALCHEMY_ENGINE_OPTIONS'] = {
        'pool_size': 10,
        'max_overflow': 5,
        'pool_timeout': 30,
        'pool_recycle': 1800,
    }

    db.init_app(app)
    return app

# --- CRUD Operations ---

def create_user(username: str, email: str, password_hash: str) -> bool:
    """Requirement 5: Wrap in transaction with rollback."""
    # Requirement 5: Input validation
    if not all(isinstance(i, str) for i in [username, email, password_hash]):
        raise TypeError("All input fields must be strings.")

    new_user = User(username=username, email=email, password_hash=password_hash)
    
    try:
        db.session.add(new_user)
        db.session.commit()
        logger.info(f"User '{username}' created successfully.")
        return True
    except SQLAlchemyError as e:
        db.session.rollback()
        # Requirement 2: Log the error, but not the sensitive data (password_hash)
        logger.error(f"Failed to create user: Database error occurred.")
        return False

def get_user_by_id(user_id: int) -> Optional[Dict[str, Any]]:
    """Requirement 1: Use ORM/Text with bindparams."""
    if not isinstance(user_id, int):
        raise TypeError("User ID must be an integer.")

    # Using text() with bindparams for demonstration
    query = text("SELECT id, username, email FROM users WHERE id = :user_id")
    result = db.session.execute(query, {"user_id": user_id}).fetchone()
    
    if result:
        return {"id": result.id, "username": result.username, "email": result.email}
    return None

def update_user_email(user_id: int, new_email: str) -> bool:
    """Update user email with transaction handling."""
    if not isinstance(user_id, int) or not isinstance(new_email, str):
        raise TypeError("Invalid input types for update.")

    try:
        user = User.query.get(user_id)
        if user:
            user.email = new_email
            db.session.commit()
            return True
        return False
    except SQLAlchemyError:
        db.session.rollback()
        logger.error("Update failed: Transaction rolled back.")
        return False

def delete_user(user_id: int) -> bool:
    """Delete user with transaction handling."""
    if not isinstance(user_id, int):
        raise TypeError("User ID must be an integer.")

    try:
        user = User.query.get(user_id)
        if user:
            db.session.delete(user)
            db.session.commit()
            return True
        return False
    except SQLAlchemyError:
        db.session.rollback()
        logger.error("Delete failed: Transaction rolled back.")
        return False