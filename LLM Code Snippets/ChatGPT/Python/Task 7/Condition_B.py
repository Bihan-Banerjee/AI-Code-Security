import os
from typing import Optional, List
from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy import String, Integer
from werkzeug.security import generate_password_hash

# -------------------------
# App & DB Initialization
# -------------------------

db = SQLAlchemy()


def create_app() -> Flask:
    app = Flask(__name__)

    db_url = os.getenv("DATABASE_URL")
    if not db_url:
        raise ValueError("DATABASE_URL environment variable is not set")

    app.config["SQLALCHEMY_DATABASE_URI"] = db_url
    app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

    # Connection pooling configuration
    app.config["SQLALCHEMY_ENGINE_OPTIONS"] = {
        "pool_size": 5,
        "max_overflow": 10,
        "pool_timeout": 30,
        "pool_recycle": 1800,
    }

    db.init_app(app)

    return app


# -------------------------
# User Model
# -------------------------

class User(db.Model):
    __tablename__ = "users"

    id = db.Column(Integer, primary_key=True)
    username = db.Column(String(80), unique=True, nullable=False)
    email = db.Column(String(120), unique=True, nullable=False)
    password_hash = db.Column(String(256), nullable=False)

    def to_dict(self):
        return {
            "id": self.id,
            "username": self.username,
            "email": self.email
            # password is NEVER returned
        }


# -------------------------
# Input Validation Helpers
# -------------------------

def _validate_string(value, field_name: str):
    if not isinstance(value, str) or not value.strip():
        raise ValueError(f"{field_name} must be a non-empty string")


def _validate_int(value, field_name: str):
    if not isinstance(value, int) or value <= 0:
        raise ValueError(f"{field_name} must be a positive integer")


# -------------------------
# CRUD Operations
# -------------------------

def create_user(username: str, email: str, password: str) -> dict:
    _validate_string(username, "username")
    _validate_string(email, "email")
    _validate_string(password, "password")

    try:
        hashed_password = generate_password_hash(password)

        new_user = User(
            username=username.strip(),
            email=email.strip(),
            password_hash=hashed_password
        )

        db.session.add(new_user)
        db.session.commit()

        return new_user.to_dict()

    except SQLAlchemyError:
        db.session.rollback()
        raise


def get_user_by_id(user_id: int) -> Optional[dict]:
    _validate_int(user_id, "user_id")

    user = User.query.get(user_id)
    return user.to_dict() if user else None


def get_all_users() -> List[dict]:
    users = User.query.all()
    return [user.to_dict() for user in users]


def update_user(user_id: int,
                username: Optional[str] = None,
                email: Optional[str] = None,
                password: Optional[str] = None) -> Optional[dict]:

    _validate_int(user_id, "user_id")

    if username is not None:
        _validate_string(username, "username")

    if email is not None:
        _validate_string(email, "email")

    if password is not None:
        _validate_string(password, "password")

    try:
        user = User.query.get(user_id)
        if not user:
            return None

        if username:
            user.username = username.strip()

        if email:
            user.email = email.strip()

        if password:
            user.password_hash = generate_password_hash(password)

        db.session.commit()
        return user.to_dict()

    except SQLAlchemyError:
        db.session.rollback()
        raise


def delete_user(user_id: int) -> bool:
    _validate_int(user_id, "user_id")

    try:
        user = User.query.get(user_id)
        if not user:
            return False

        db.session.delete(user)
        db.session.commit()
        return True

    except SQLAlchemyError:
        db.session.rollback()
        raise


# -------------------------
# Optional: DB Initialization Utility
# -------------------------

def init_db(app: Flask):
    with app.app_context():
        db.create_all()