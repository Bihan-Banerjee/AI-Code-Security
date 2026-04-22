"""
User CRUD operations module with secure database handling.
Follows Flask-SQLAlchemy conventions with security best practices.
"""

import os
import logging
from typing import Optional, Dict, Any, List
from contextlib import contextmanager
from sqlalchemy import (
    create_engine, Column, Integer, String, DateTime, Boolean, 
    text, event, exc
)
from sqlalchemy.orm import sessionmaker, declarative_base, Session
from sqlalchemy.pool import QueuePool
from datetime import datetime
import bcrypt

# Configure logging
logger = logging.getLogger(__name__)

# Create base class for declarative models
Base = declarative_base()

# Define User model
class User(Base):
    """User entity model following Flask-SQLAlchemy conventions."""
    __tablename__ = 'users'
    
    id = Column(Integer, primary_key=True)
    username = Column(String(80), unique=True, nullable=False, index=True)
    email = Column(String(120), unique=True, nullable=False, index=True)
    password_hash = Column(String(128), nullable=False)
    full_name = Column(String(100))
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def set_password(self, password: str) -> None:
        """Hash and set password (never store plain text)."""
        if not isinstance(password, str):
            raise TypeError("Password must be a string")
        if len(password) < 8:
            raise ValueError("Password must be at least 8 characters")
        salt = bcrypt.gensalt()
        self.password_hash = bcrypt.hashpw(password.encode('utf-8'), salt).decode('utf-8')
    
    def check_password(self, password: str) -> bool:
        """Verify password against stored hash."""
        if not isinstance(password, str):
            raise TypeError("Password must be a string")
        return bcrypt.checkpw(
            password.encode('utf-8'), 
            self.password_hash.encode('utf-8')
        )
    
    def to_dict(self, include_sensitive: bool = False) -> Dict[str, Any]:
        """Convert user object to dictionary, excluding sensitive data by default."""
        data = {
            'id': self.id,
            'username': self.username,
            'email': self.email,
            'full_name': self.full_name,
            'is_active': self.is_active,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
        }
        if include_sensitive:
            # Only include password hash for internal use, never plain password
            data['password_hash'] = self.password_hash
        return data


class DatabaseManager:
    """Manages database connection and CRUD operations with security best practices."""
    
    def __init__(self):
        """Initialize database connection with settings from environment variables."""
        # Load connection string from environment variable
        self.database_url = os.environ.get('DATABASE_URL')
        if not self.database_url:
            raise ValueError(
                "DATABASE_URL environment variable is not set. "
                "Example: postgresql://user:pass@localhost/dbname"
            )
        
        # Configure connection pooling
        self.pool_size = int(os.environ.get('DB_POOL_SIZE', 10))
        self.pool_timeout = int(os.environ.get('DB_POOL_TIMEOUT', 30))
        self.pool_max_overflow = int(os.environ.get('DB_POOL_MAX_OVERFLOW', 20))
        
        # Create engine with connection pooling
        self.engine = create_engine(
            self.database_url,
            poolclass=QueuePool,
            pool_size=self.pool_size,
            pool_timeout=self.pool_timeout,
            pool_pre_ping=True,  # Verify connections before using
            max_overflow=self.pool_max_overflow,
            echo=False  # Set to True only for debugging, never in production
        )
        
        # Create session factory
        self.SessionLocal = sessionmaker(
            autocommit=False,
            autoflush=False,
            bind=self.engine
        )
        
        # Create tables if they don't exist
        Base.metadata.create_all(bind=self.engine)
        
        logger.info("Database connection initialized with pooling (size=%s, timeout=%s)", 
                   self.pool_size, self.pool_timeout)
    
    @contextmanager
    def get_session(self):
        """Provide a transactional scope around a series of operations."""
        session = self.SessionLocal()
        try:
            yield session
            session.commit()
        except Exception as e:
            session.rollback()
            logger.error("Transaction rolled back due to error: %s", str(e))
            raise
        finally:
            session.close()
    
    # CRUD Operations
    
    def create_user(self, username: str, email: str, password: str, 
                   full_name: Optional[str] = None) -> User:
        """
        Create a new user.
        
        Args:
            username: Unique username
            email: Unique email address
            password: Plain text password (will be hashed)
            full_name: Optional full name
            
        Returns:
            Created User object
            
        Raises:
            TypeError: If input types are invalid
            ValueError: If user already exists
        """
        # Input validation
        if not isinstance(username, str) or not username.strip():
            raise TypeError("Username must be a non-empty string")
        if not isinstance(email, str) or '@' not in email:
            raise TypeError("Email must be a valid email string")
        if not isinstance(password, str):
            raise TypeError("Password must be a string")
        if full_name is not None and not isinstance(full_name, str):
            raise TypeError("Full name must be a string or None")
        
        with self.get_session() as session:
            # Check if user already exists using ORM
            existing_user = session.query(User).filter(
                (User.username == username) | (User.email == email)
            ).first()
            
            if existing_user:
                if existing_user.username == username:
                    raise ValueError(f"User with username '{username}' already exists")
                else:
                    raise ValueError(f"User with email '{email}' already exists")
            
            # Create new user
            user = User(
                username=username.strip(),
                email=email.strip().lower(),
                full_name=full_name.strip() if full_name else None
            )
            user.set_password(password)
            
            session.add(user)
            session.flush()  # Get the ID without committing
            
            # Log without sensitive data
            logger.info("Created user with ID: %s, username: %s", user.id, username)
            
            return user
    
    def get_user_by_id(self, user_id: int) -> Optional[User]:
        """
        Retrieve user by ID using ORM.
        
        Args:
            user_id: User ID integer
            
        Returns:
            User object or None if not found
        """
        if not isinstance(user_id, int) or user_id <= 0:
            raise TypeError("User ID must be a positive integer")
        
        with self.get_session() as session:
            # Using ORM get method for primary key lookup
            user = session.get(User, user_id)
            return user
    
    def get_user_by_username(self, username: str) -> Optional[User]:
        """
        Retrieve user by username using ORM.
        
        Args:
            username: Username string
            
        Returns:
            User object or None if not found
        """
        if not isinstance(username, str) or not username.strip():
            raise TypeError("Username must be a non-empty string")
        
        with self.get_session() as session:
            # Using ORM query with filter
            user = session.query(User).filter(User.username == username.strip()).first()
            return user
    
    def get_user_by_email(self, email: str) -> Optional[User]:
        """
        Retrieve user by email using text() with bind parameters.
        
        Args:
            email: Email address string
            
        Returns:
            User object or None if not found
        """
        if not isinstance(email, str) or '@' not in email:
            raise TypeError("Email must be a valid email string")
        
        with self.get_session() as session:
            # Using text() with bindparams (no string interpolation)
            query = text("SELECT * FROM users WHERE email = :email")
            result = session.execute(query, {"email": email.strip().lower()})
            row = result.first()
            
            if row:
                # Convert row to User object
                user = User(
                    id=row.id,
                    username=row.username,
                    email=row.email,
                    password_hash=row.password_hash,
                    full_name=row.full_name,
                    is_active=row.is_active,
                    created_at=row.created_at,
                    updated_at=row.updated_at
                )
                return user
            return None
    
    def update_user(self, user_id: int, **kwargs) -> Optional[User]:
        """
        Update user fields.
        
        Args:
            user_id: User ID
            **kwargs: Fields to update (username, email, full_name, is_active, password)
            
        Returns:
            Updated User object or None if not found
        """
        if not isinstance(user_id, int) or user_id <= 0:
            raise TypeError("User ID must be a positive integer")
        
        # Validate update fields
        allowed_fields = {'username', 'email', 'full_name', 'is_active', 'password'}
        for field in kwargs:
            if field not in allowed_fields:
                raise ValueError(f"Invalid field for update: {field}")
        
        with self.get_session() as session:
            user = session.get(User, user_id)
            if not user:
                logger.warning("Update failed: User ID %s not found", user_id)
                return None
            
            # Apply updates with validation
            if 'username' in kwargs:
                username = kwargs['username']
                if not isinstance(username, str) or not username.strip():
                    raise TypeError("Username must be a non-empty string")
                user.username = username.strip()
            
            if 'email' in kwargs:
                email = kwargs['email']
                if not isinstance(email, str) or '@' not in email:
                    raise TypeError("Email must be a valid email string")
                user.email = email.strip().lower()
            
            if 'full_name' in kwargs:
                full_name = kwargs['full_name']
                if full_name is not None and not isinstance(full_name, str):
                    raise TypeError("Full name must be a string or None")
                user.full_name = full_name.strip() if full_name else None
            
            if 'is_active' in kwargs:
                is_active = kwargs['is_active']
                if not isinstance(is_active, bool):
                    raise TypeError("is_active must be a boolean")
                user.is_active = is_active
            
            if 'password' in kwargs:
                password = kwargs['password']
                if not isinstance(password, str):
                    raise TypeError("Password must be a string")
                user.set_password(password)
            
            session.flush()
            logger.info("Updated user ID: %s", user_id)
            
            return user
    
    def delete_user(self, user_id: int) -> bool:
        """
        Delete a user by ID.
        
        Args:
            user_id: User ID
            
        Returns:
            True if deleted, False if not found
        """
        if not isinstance(user_id, int) or user_id <= 0:
            raise TypeError("User ID must be a positive integer")
        
        with self.get_session() as session:
            user = session.get(User, user_id)
            if not user:
                logger.warning("Delete failed: User ID %s not found", user_id)
                return False
            
            session.delete(user)
            session.flush()
            logger.info("Deleted user ID: %s", user_id)
            return True
    
    def list_users(self, skip: int = 0, limit: int = 100, 
                  active_only: bool = False) -> List[User]:
        """
        List users with pagination.
        
        Args:
            skip: Number of records to skip
            limit: Maximum number of records to return
            active_only: If True, return only active users
            
        Returns:
            List of User objects
        """
        if not isinstance(skip, int) or skip < 0:
            raise TypeError("Skip must be a non-negative integer")
        if not isinstance(limit, int) or limit <= 0:
            raise TypeError("Limit must be a positive integer")
        if not isinstance(active_only, bool):
            raise TypeError("active_only must be a boolean")
        
        with self.get_session() as session:
            query = session.query(User)
            
            if active_only:
                query = query.filter(User.is_active == True)
            
            # Using ORM with offset/limit (no string interpolation)
            users = query.order_by(User.id).offset(skip).limit(limit).all()
            
            logger.info("Listed %d users (skip=%s, limit=%s, active_only=%s)", 
                       len(users), skip, limit, active_only)
            return users
    
    def search_users(self, search_term: str, limit: int = 50) -> List[User]:
        """
        Search users by username or email using text() with bindparams.
        
        Args:
            search_term: Term to search for
            limit: Maximum number of results
            
        Returns:
            List of User objects
        """
        if not isinstance(search_term, str) or not search_term.strip():
            raise TypeError("Search term must be a non-empty string")
        if not isinstance(limit, int) or limit <= 0:
            raise TypeError("Limit must be a positive integer")
        
        with self.get_session() as session:
            # Using text() with bindparams to prevent SQL injection
            query = text("""
                SELECT * FROM users 
                WHERE username LIKE :pattern OR email LIKE :pattern
                ORDER BY id
                LIMIT :limit
            """)
            
            result = session.execute(
                query, 
                {"pattern": f"%{search_term}%", "limit": limit}
            )
            
            users = []
            for row in result:
                user = User(
                    id=row.id,
                    username=row.username,
                    email=row.email,
                    password_hash=row.password_hash,
                    full_name=row.full_name,
                    is_active=row.is_active,
                    created_at=row.created_at,
                    updated_at=row.updated_at
                )
                users.append(user)
            
            logger.info("Search for '%s' returned %d users", search_term, len(users))
            return users
    
    def close(self):
        """Close all database connections."""
        self.engine.dispose()
        logger.info("Database connections closed")


# Singleton instance for application-wide use
_db_manager = None

def get_db() -> DatabaseManager:
    """Get or create the database manager singleton."""
    global _db_manager
    if _db_manager is None:
        _db_manager = DatabaseManager()
    return _db_manager