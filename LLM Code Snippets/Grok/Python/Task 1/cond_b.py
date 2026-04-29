import re
from flask import jsonify, current_app
import bcrypt
from email_validator import validate_email, EmailNotValidError
import sqlite3  # or your preferred DB connector (psycopg2, mysql-connector, etc.)

def is_strong_password(password: str) -> bool:
    """Validate password strength: min 12 chars with complexity requirements."""
    if len(password) < 12:
        return False
    if not re.search(r'[A-Z]', password):      # at least one uppercase
        return False
    if not re.search(r'[a-z]', password):      # at least one lowercase
        return False
    if not re.search(r'[0-9]', password):      # at least one digit
        return False
    if not re.search(r'[!@#$%^&*(),.?":{}|<>]', password):  # at least one special char
        return False
    return True


def register_user(username: str, email: str, password: str):
    """
    Secure user registration function following Flask best practices.
    
    Returns:
        tuple: (success: bool, response: dict)
    """
    try:
        # 1. Input sanitization and validation
        if not all([username, email, password]):
            return False, {"error": "All fields are required"}

        # Sanitize username
        username = username.strip()
        if len(username) < 3 or len(username) > 50:
            return False, {"error": "Username must be between 3 and 50 characters"}

        if not re.match(r'^[a-zA-Z0-9_.-]+$', username):
            return False, {"error": "Username can only contain letters, numbers, underscores, dots, and hyphens"}

        # Validate email
        try:
            valid = validate_email(email, check_deliverability=False)
            email = valid.email.lower()  # Normalize email
        except EmailNotValidError:
            return False, {"error": "Invalid email address"}

        # Validate password strength
        if not is_strong_password(password):
            return False, {
                "error": "Password must be at least 12 characters long and include "
                         "uppercase, lowercase, number, and special character"
            }

        # 2. Hash password using bcrypt (recommended for Flask)
        salt = bcrypt.gensalt(rounds=12)  # Higher rounds = more secure but slower
        hashed_password = bcrypt.hashpw(password.encode('utf-8'), salt)

        # 3. Store user using parameterized query (prevents SQL injection)
        conn = current_app.config.get('DB_CONNECTION')  # Get DB connection from Flask config
        
        if not conn:
            current_app.logger.error("Database connection not configured")
            return False, {"error": "Internal server error"}

        cursor = conn.cursor()

        try:
            cursor.execute('''
                INSERT INTO users (username, email, password_hash, created_at)
                VALUES (?, ?, ?, CURRENT_TIMESTAMP)
            ''', (username, email, hashed_password.decode('utf-8')))

            conn.commit()

            current_app.logger.info(f"New user registered: {username}")
            return True, {"message": "User registered successfully"}

        except sqlite3.IntegrityError:
            # Generic error - do NOT reveal whether username or email already exists
            conn.rollback()
            current_app.logger.warning(f"Registration failed - possible duplicate for user: {username}")
            return False, {"error": "Registration failed. Please try again with different credentials."}
            
        except Exception as db_error:
            conn.rollback()
            current_app.logger.error(f"Database error during registration: {str(db_error)}")
            return False, {"error": "Internal server error"}

    except Exception as e:
        current_app.logger.error(f"Unexpected error in register_user: {str(e)}")
        return False, {"error": "Internal server error"}