import os
from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import validates

# Initialize Flask app
app = Flask(__name__)

# Load DB connection string from environment variable
db_url = os.getenv("DATABASE_URL")
if not db_url:
    raise RuntimeError("DATABASE_URL environment variable not set")

# Configure SQLAlchemy with connection pooling
app.config["SQLALCHEMY_DATABASE_URI"] = db_url
app.config["SQLALCHEMY_ENGINE_OPTIONS"] = {
    "pool_size": 10,          # sensible pool size
    "pool_timeout": 30,       # timeout in seconds
    "pool_recycle": 1800      # recycle connections every 30 minutes
}
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

db = SQLAlchemy(app)


# Define User model
class User(db.Model):
    __tablename__ = "users"

    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(128), nullable=False)  # store only hashed passwords

    @validates("username", "email", "password_hash")
    def validate_fields(self, key, value):
        if not isinstance(value, str):
            raise ValueError(f"{key} must be a string")
        if key == "email" and "@" not in value:
            raise ValueError("Invalid email format")
        return value


# CRUD operations
class UserRepository:

    @staticmethod
    def create_user(username: str, email: str, password_hash: str):
        if not all(isinstance(arg, str) for arg in [username, email, password_hash]):
            raise TypeError("All arguments must be strings")

        new_user = User(username=username, email=email, password_hash=password_hash)
        try:
            db.session.add(new_user)
            db.session.commit()
            return new_user
        except SQLAlchemyError as e:
            db.session.rollback()
            raise e

    @staticmethod
    def get_user_by_id(user_id: int):
        if not isinstance(user_id, int):
            raise TypeError("user_id must be an integer")

        return db.session.get(User, user_id)

    @staticmethod
    def update_user(user_id: int, **kwargs):
        if not isinstance(user_id, int):
            raise TypeError("user_id must be an integer")

        user = db.session.get(User, user_id)
        if not user:
            return None

        try:
            for key, value in kwargs.items():
                if hasattr(user, key):
                    setattr(user, key, value)
            db.session.commit()
            return user
        except SQLAlchemyError as e:
            db.session.rollback()
            raise e

    @staticmethod
    def delete_user(user_id: int):
        if not isinstance(user_id, int):
            raise TypeError("user_id must be an integer")

        user = db.session.get(User, user_id)
        if not user:
            return False

        try:
            db.session.delete(user)
            db.session.commit()
            return True
        except SQLAlchemyError as e:
            db.session.rollback()
            raise e

    @staticmethod
    def find_user_by_email(email: str):
        if not isinstance(email, str):
            raise TypeError("email must be a string")

        stmt = text("SELECT * FROM users WHERE email = :email").bindparams(email=email)
        result = db.session.execute(stmt).mappings().first()
        return result


# Example usage (not executed automatically)
if __name__ == "__main__":
    with app.app_context():
        db.create_all()
        # Example: UserRepository.create_user("alice", "alice@example.com", "hashed_password")
