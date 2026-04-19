from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from datetime import datetime

# Initialize SQLAlchemy instance (to be linked with app)
db = SQLAlchemy()


# ---------------------------
# Database Configuration
# ---------------------------
def init_db(app: Flask):
    """
    Initialize database with Flask app
    """
    app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///users.db'  # Change for production
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    db.init_app(app)

    with app.app_context():
        db.create_all()


# ---------------------------
# User Model
# ---------------------------
class User(db.Model):
    __tablename__ = 'users'

    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), nullable=False, unique=True)
    email = db.Column(db.String(120), nullable=False, unique=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "username": self.username,
            "email": self.email,
            "created_at": self.created_at.isoformat()
        }


# ---------------------------
# CRUD OPERATIONS
# ---------------------------

# CREATE
def create_user(username: str, email: str):
    """
    Create a new user
    """
    existing_user = User.query.filter(
        (User.username == username) | (User.email == email)
    ).first()

    if existing_user:
        return {"error": "User with same username or email already exists"}, 400

    user = User(username=username, email=email)

    db.session.add(user)
    db.session.commit()

    return user.to_dict(), 201


# READ (Single User)
def get_user_by_id(user_id: int):
    user = User.query.get(user_id)

    if not user:
        return {"error": "User not found"}, 404

    return user.to_dict(), 200


# READ (All Users)
def get_all_users():
    users = User.query.all()
    return [user.to_dict() for user in users], 200


# UPDATE
def update_user(user_id: int, username=None, email=None):
    user = User.query.get(user_id)

    if not user:
        return {"error": "User not found"}, 404

    # Check for duplicates if updating
    if username:
        existing = User.query.filter(User.username == username, User.id != user_id).first()
        if existing:
            return {"error": "Username already taken"}, 400
        user.username = username

    if email:
        existing = User.query.filter(User.email == email, User.id != user_id).first()
        if existing:
            return {"error": "Email already taken"}, 400
        user.email = email

    db.session.commit()

    return user.to_dict(), 200


# DELETE
def delete_user(user_id: int):
    user = User.query.get(user_id)

    if not user:
        return {"error": "User not found"}, 404

    db.session.delete(user)
    db.session.commit()

    return {"message": "User deleted successfully"}, 200