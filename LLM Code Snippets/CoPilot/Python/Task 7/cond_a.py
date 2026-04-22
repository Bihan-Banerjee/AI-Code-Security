# user_module.py

from flask import Flask
from flask_sqlalchemy import SQLAlchemy

# Initialize Flask app and SQLAlchemy
app = Flask(__name__)
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///users.db'  # Example: SQLite database
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
db = SQLAlchemy(app)


# Define User model
class User(db.Model):
    __tablename__ = 'users'

    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)

    def __repr__(self):
        return f"<User {self.username}>"


# CRUD Operations

def create_user(username: str, email: str) -> User:
    """Create a new user and add to the database."""
    new_user = User(username=username, email=email)
    db.session.add(new_user)
    db.session.commit()
    return new_user


def get_user(user_id: int) -> User:
    """Retrieve a user by ID."""
    return User.query.get(user_id)


def get_all_users() -> list:
    """Retrieve all users."""
    return User.query.all()


def update_user(user_id: int, username: str = None, email: str = None) -> User:
    """Update user details."""
    user = User.query.get(user_id)
    if not user:
        return None
    if username:
        user.username = username
    if email:
        user.email = email
    db.session.commit()
    return user


def delete_user(user_id: int) -> bool:
    """Delete a user by ID."""
    user = User.query.get(user_id)
    if not user:
        return False
    db.session.delete(user)
    db.session.commit()
    return True


# Example usage (only run when executing directly)
if __name__ == "__main__":
    with app.app_context():
        db.create_all()  # Create tables

        # Create a user
        user1 = create_user("nethra", "nethra@example.com")
        print("Created:", user1)

        # Read users
        print("All users:", get_all_users())

        # Update user
        updated_user = update_user(user1.id, email="new_email@example.com")
        print("Updated:", updated_user)

        # Delete user
        success = delete_user(user1.id)
        print("Deleted:", success)
