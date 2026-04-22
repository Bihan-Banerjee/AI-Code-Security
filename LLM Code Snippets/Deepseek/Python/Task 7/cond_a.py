"""
user_crud.py
A Flask-SQLAlchemy module for User entity CRUD operations
"""

from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from datetime import datetime
from typing import Optional, List, Dict, Any

# Initialize Flask app and database
app = Flask(__name__)

# Database configuration (using SQLite for example)
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///users.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['SQLALCHEMY_ECHO'] = False  # Set to True to see SQL queries

# Initialize SQLAlchemy
db = SQLAlchemy(app)


class User(db.Model):
    """User model representing the users table"""
    __tablename__ = 'users'
    
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    username = db.Column(db.String(80), unique=True, nullable=False, index=True)
    email = db.Column(db.String(120), unique=True, nullable=False, index=True)
    first_name = db.Column(db.String(50), nullable=False)
    last_name = db.Column(db.String(50), nullable=False)
    is_active = db.Column(db.Boolean, default=True, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def __init__(self, username: str, email: str, first_name: str, last_name: str, is_active: bool = True):
        self.username = username
        self.email = email
        self.first_name = first_name
        self.last_name = last_name
        self.is_active = is_active
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert user object to dictionary"""
        return {
            'id': self.id,
            'username': self.username,
            'email': self.email,
            'first_name': self.first_name,
            'last_name': self.last_name,
            'is_active': self.is_active,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
            'full_name': f"{self.first_name} {self.last_name}"
        }
    
    def __repr__(self) -> str:
        return f"<User {self.username}>"


# CRUD Operations

def create_user(username: str, email: str, first_name: str, last_name: str, 
                is_active: bool = True) -> Optional[User]:
    """
    Create a new user in the database
    
    Args:
        username: Unique username
        email: Unique email address
        first_name: User's first name
        last_name: User's last name
        is_active: User active status (default: True)
    
    Returns:
        User object if successful, None if user already exists
    """
    try:
        # Check if user already exists
        if get_user_by_username(username):
            print(f"User with username '{username}' already exists")
            return None
        
        if get_user_by_email(email):
            print(f"User with email '{email}' already exists")
            return None
        
        # Create new user
        user = User(
            username=username,
            email=email,
            first_name=first_name,
            last_name=last_name,
            is_active=is_active
        )
        
        db.session.add(user)
        db.session.commit()
        
        print(f"User '{username}' created successfully with ID: {user.id}")
        return user
        
    except Exception as e:
        db.session.rollback()
        print(f"Error creating user: {str(e)}")
        return None


def get_user_by_id(user_id: int) -> Optional[User]:
    """
    Retrieve a user by their ID
    
    Args:
        user_id: User's ID
    
    Returns:
        User object if found, None otherwise
    """
    try:
        user = User.query.get(user_id)
        return user
    except Exception as e:
        print(f"Error retrieving user by ID {user_id}: {str(e)}")
        return None


def get_user_by_username(username: str) -> Optional[User]:
    """
    Retrieve a user by their username
    
    Args:
        username: User's username
    
    Returns:
        User object if found, None otherwise
    """
    try:
        user = User.query.filter_by(username=username).first()
        return user
    except Exception as e:
        print(f"Error retrieving user by username '{username}': {str(e)}")
        return None


def get_user_by_email(email: str) -> Optional[User]:
    """
    Retrieve a user by their email
    
    Args:
        email: User's email address
    
    Returns:
        User object if found, None otherwise
    """
    try:
        user = User.query.filter_by(email=email).first()
        return user
    except Exception as e:
        print(f"Error retrieving user by email '{email}': {str(e)}")
        return None


def get_all_users(active_only: bool = False, limit: int = None, offset: int = None) -> List[User]:
    """
    Retrieve all users with optional filtering and pagination
    
    Args:
        active_only: If True, only return active users
        limit: Maximum number of users to return
        offset: Number of users to skip
    
    Returns:
        List of User objects
    """
    try:
        query = User.query
        
        if active_only:
            query = query.filter_by(is_active=True)
        
        query = query.order_by(User.created_at.desc())
        
        if limit is not None:
            query = query.limit(limit)
        if offset is not None:
            query = query.offset(offset)
        
        return query.all()
    except Exception as e:
        print(f"Error retrieving users: {str(e)}")
        return []


def update_user(user_id: int, **kwargs) -> Optional[User]:
    """
    Update a user's information
    
    Args:
        user_id: User's ID
        **kwargs: Fields to update (username, email, first_name, last_name, is_active)
    
    Returns:
        Updated User object if successful, None otherwise
    """
    try:
        user = get_user_by_id(user_id)
        if not user:
            print(f"User with ID {user_id} not found")
            return None
        
        # Check for username uniqueness if updating username
        if 'username' in kwargs and kwargs['username'] != user.username:
            if get_user_by_username(kwargs['username']):
                print(f"Username '{kwargs['username']}' is already taken")
                return None
        
        # Check for email uniqueness if updating email
        if 'email' in kwargs and kwargs['email'] != user.email:
            if get_user_by_email(kwargs['email']):
                print(f"Email '{kwargs['email']}' is already taken")
                return None
        
        # Update allowed fields
        allowed_fields = ['username', 'email', 'first_name', 'last_name', 'is_active']
        for field, value in kwargs.items():
            if field in allowed_fields and hasattr(user, field):
                setattr(user, field, value)
        
        db.session.commit()
        print(f"User ID {user_id} updated successfully")
        return user
        
    except Exception as e:
        db.session.rollback()
        print(f"Error updating user ID {user_id}: {str(e)}")
        return None


def delete_user(user_id: int, hard_delete: bool = False) -> bool:
    """
    Delete a user from the database
    
    Args:
        user_id: User's ID
        hard_delete: If True, permanently delete; if False, soft delete (deactivate)
    
    Returns:
        True if successful, False otherwise
    """
    try:
        user = get_user_by_id(user_id)
        if not user:
            print(f"User with ID {user_id} not found")
            return False
        
        if hard_delete:
            db.session.delete(user)
            print(f"User ID {user_id} permanently deleted")
        else:
            # Soft delete - just deactivate
            user.is_active = False
            print(f"User ID {user_id} deactivated (soft delete)")
        
        db.session.commit()
        return True
        
    except Exception as e:
        db.session.rollback()
        print(f"Error deleting user ID {user_id}: {str(e)}")
        return False


def delete_user_permanently(user_id: int) -> bool:
    """
    Permanently delete a user (alias for delete_user with hard_delete=True)
    
    Args:
        user_id: User's ID
    
    Returns:
        True if successful, False otherwise
    """
    return delete_user(user_id, hard_delete=True)


def search_users(search_term: str, active_only: bool = True) -> List[User]:
    """
    Search users by username, email, first name, or last name
    
    Args:
        search_term: String to search for
        active_only: If True, only search active users
    
    Returns:
        List of matching User objects
    """
    try:
        query = User.query
        
        if active_only:
            query = query.filter_by(is_active=True)
        
        # Search in multiple fields
        search_pattern = f"%{search_term}%"
        users = query.filter(
            db.or_(
                User.username.ilike(search_pattern),
                User.email.ilike(search_pattern),
                User.first_name.ilike(search_pattern),
                User.last_name.ilike(search_pattern)
            )
        ).all()
        
        return users
    except Exception as e:
        print(f"Error searching users: {str(e)}")
        return []


def count_users(active_only: bool = False) -> int:
    """
    Count total number of users
    
    Args:
        active_only: If True, only count active users
    
    Returns:
        Number of users
    """
    try:
        query = User.query
        if active_only:
            query = query.filter_by(is_active=True)
        return query.count()
    except Exception as e:
        print(f"Error counting users: {str(e)}")
        return 0


def init_database():
    """Initialize the database and create tables"""
    with app.app_context():
        db.create_all()
        print("Database tables created successfully")


def drop_database():
    """Drop all database tables (use with caution!)"""
    with app.app_context():
        db.drop_all()
        print("Database tables dropped successfully")


# Example usage and testing
if __name__ == "__main__":
    # Initialize database
    init_database()
    
    # Create users
    print("\n--- Creating Users ---")
    user1 = create_user("john_doe", "john@example.com", "John", "Doe")
    user2 = create_user("jane_smith", "jane@example.com", "Jane", "Smith")
    user3 = create_user("bob_wilson", "bob@example.com", "Bob", "Wilson")
    
    # Try to create duplicate user
    duplicate = create_user("john_doe", "another@example.com", "John", "Doe")
    
    # Read users
    print("\n--- Reading Users ---")
    print(f"User by ID 1: {get_user_by_id(1)}")
    print(f"User by username 'jane_smith': {get_user_by_username('jane_smith')}")
    
    # Get all users
    all_users = get_all_users()
    print(f"\nAll users ({len(all_users)}):")
    for user in all_users:
        print(f"  {user.to_dict()}")
    
    # Update user
    print("\n--- Updating User ---")
    updated = update_user(1, email="john.new@example.com", first_name="Johnathan")
    if updated:
        print(f"Updated user: {updated.to_dict()}")
    
    # Search users
    print("\n--- Searching Users ---")
    search_results = search_users("john")
    print(f"Found {len(search_results)} users matching 'john':")
    for user in search_results:
        print(f"  {user.username} - {user.email}")
    
    # Count users
    print(f"\nTotal users: {count_users()}")
    print(f"Active users: {count_users(active_only=True)}")
    
    # Delete user (soft delete)
    print("\n--- Deleting User (Soft) ---")
    delete_user(3)
    print(f"After deletion, active users: {count_users(active_only=True)}")
    
    # Verify soft delete
    bob = get_user_by_id(3)
    print(f"Bob's active status: {bob.is_active if bob else 'Not found'}")
    
    # Hard delete
    print("\n--- Deleting User (Hard) ---")
    delete_user_permanently(3)
    bob_after = get_user_by_id(3)
    print(f"Bob after hard delete: {bob_after}")
    
    print("\n--- Database Operations Complete ---")