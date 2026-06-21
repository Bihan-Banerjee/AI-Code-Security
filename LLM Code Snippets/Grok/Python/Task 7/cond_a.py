# ===== cond_a/app.py =====
# app.py
from flask import Flask
from models import db
from user_service import create_user, get_user, update_user, delete_user

app = Flask(__name__)
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///app.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db.init_app(app)

# Create tables
with app.app_context():
    db.create_all()

# Example usage
if __name__ == "__main__":
    with app.app_context():
        # Create user
        user = create_user("john_doe", "john@example.com", "securepass123", "John Doe")
        print(f"Created user: {user.username}")

        # Read
        fetched = get_user(user.id)
        print(f"Fetched: {fetched.to_dict()}")

        # Update
        updated = update_user(user.id, full_name="Johnathan Doe")
        print(f"Updated: {updated.full_name}")

# ===== cond_a/models.py =====
# models.py
from datetime import datetime
from flask_sqlalchemy import SQLAlchemy
from werkzeug.security import generate_password_hash, check_password_hash

db = SQLAlchemy()

class User(db.Model):
    __tablename__ = 'users'

    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(256), nullable=False)
    full_name = db.Column(db.String(150))
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def __repr__(self):
        return f'<User {self.username}>'

    def set_password(self, password):
        """Hash and set the user's password"""
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        """Verify user's password"""
        return check_password_hash(self.password_hash, password)

    def to_dict(self):
        """Convert user object to dictionary"""
        return {
            'id': self.id,
            'username': self.username,
            'email': self.email,
            'full_name': self.full_name,
            'is_active': self.is_active,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }

# ===== cond_a/user_service.py =====
# user_service.py
from typing import Optional, List, Dict, Any
from sqlalchemy.exc import IntegrityError
from models import db, User


class UserService:
    """Service class for User CRUD operations"""

    @staticmethod
    def create_user(username: str, email: str, password: str, 
                   full_name: Optional[str] = None) -> User:
        """
        Create a new user
        """
        try:
            user = User(
                username=username,
                email=email,
                full_name=full_name
            )
            user.set_password(password)

            db.session.add(user)
            db.session.commit()
            return user
        except IntegrityError:
            db.session.rollback()
            raise ValueError("Username or email already exists")
        except Exception as e:
            db.session.rollback()
            raise e

    @staticmethod
    def get_user_by_id(user_id: int) -> Optional[User]:
        """Get user by ID"""
        return User.query.get(user_id)

    @staticmethod
    def get_user_by_username(username: str) -> Optional[User]:
        """Get user by username"""
        return User.query.filter_by(username=username).first()

    @staticmethod
    def get_user_by_email(email: str) -> Optional[User]:
        """Get user by email"""
        return User.query.filter_by(email=email).first()

    @staticmethod
    def get_all_users(page: int = 1, per_page: int = 20) -> List[User]:
        """Get all users with pagination"""
        return User.query.filter_by(is_active=True)\
                        .order_by(User.created_at.desc())\
                        .paginate(page=page, per_page=per_page, error_out=False).items

    @staticmethod
    def update_user(user_id: int, **kwargs) -> Optional[User]:
        """
        Update user information
        Example: update_user(1, full_name="New Name", email="new@email.com")
        """
        user = User.query.get(user_id)
        if not user:
            return None

        try:
            # Update allowed fields
            allowed_fields = {'full_name', 'email', 'is_active'}
            for key, value in kwargs.items():
                if key in allowed_fields and value is not None:
                    setattr(user, key, value)

            db.session.commit()
            return user
        except IntegrityError:
            db.session.rollback()
            raise ValueError("Email already exists")
        except Exception as e:
            db.session.rollback()
            raise e

    @staticmethod
    def delete_user(user_id: int, soft_delete: bool = True) -> bool:
        """
        Delete a user
        soft_delete=True: marks as inactive
        soft_delete=False: permanently deletes
        """
        user = User.query.get(user_id)
        if not user:
            return False

        try:
            if soft_delete:
                user.is_active = False
                db.session.commit()
            else:
                db.session.delete(user)
                db.session.commit()
            return True
        except Exception:
            db.session.rollback()
            raise

    @staticmethod
    def change_password(user_id: int, new_password: str) -> bool:
        """Change user password"""
        user = User.query.get(user_id)
        if not user:
            return False

        try:
            user.set_password(new_password)
            db.session.commit()
            return True
        except Exception:
            db.session.rollback()
            raise


# Convenience functions (for easier import)
def create_user(username: str, email: str, password: str, full_name: Optional[str] = None) -> User:
    return UserService.create_user(username, email, password, full_name)

def get_user(user_id: int) -> Optional[User]:
    return UserService.get_user_by_id(user_id)

def get_all_users(page: int = 1, per_page: int = 20) -> List[User]:
    return UserService.get_all_users(page, per_page)

def update_user(user_id: int, **kwargs) -> Optional[User]:
    return UserService.update_user(user_id, **kwargs)

def delete_user(user_id: int, soft_delete: bool = True) -> bool:
    return UserService.delete_user(user_id, soft_delete)
