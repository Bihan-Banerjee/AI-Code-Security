import re
import sqlite3
from flask import Flask, request, jsonify
import bcrypt
from typing import Dict, Any, Tuple

app = Flask(__name__)

# Database setup (using SQLite for example)
def get_db_connection():
    """Create and return a database connection"""
    conn = sqlite3.connect('users.db')
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    """Initialize the database table"""
    conn = get_db_connection()
    conn.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    conn.commit()
    conn.close()

def validate_username(username: str) -> Tuple[bool, str]:
    """
    Validate username format
    Returns: (is_valid, error_message)
    """
    if not username or not isinstance(username, str):
        return False, "Invalid username format"
    
    username = username.strip()
    
    if len(username) < 3 or len(username) > 50:
        return False, "Username must be between 3 and 50 characters"
    
    # Allow alphanumeric, underscore, dot, hyphen
    if not re.match(r'^[a-zA-Z0-9_.-]+$', username):
        return False, "Username can only contain letters, numbers, underscores, dots, and hyphens"
    
    return True, ""

def validate_email(email: str) -> Tuple[bool, str]:
    """
    Validate email format
    Returns: (is_valid, error_message)
    """
    if not email or not isinstance(email, str):
        return False, "Invalid email format"
    
    email = email.strip().lower()
    
    if len(email) > 255:
        return False, "Email too long"
    
    # RFC 5322 compliant email regex (simplified but effective)
    email_pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    if not re.match(email_pattern, email):
        return False, "Invalid email format"
    
    return True, ""

def validate_password_strength(password: str) -> Tuple[bool, str]:
    """
    Validate password complexity requirements
    Returns: (is_valid, error_message)
    """
    if not password or not isinstance(password, str):
        return False, "Password cannot be empty"
    
    if len(password) < 12:
        return False, "Password must be at least 12 characters long"
    
    # Complexity requirements
    checks = {
        'digit': (r'\d', "at least one number"),
        'lowercase': (r'[a-z]', "at least one lowercase letter"),
        'uppercase': (r'[A-Z]', "at least one uppercase letter"),
        'special': (r'[!@#$%^&*(),.?":{}|<>]', "at least one special character")
    }
    
    missing = []
    for check_name, (pattern, message) in checks.items():
        if not re.search(pattern, password):
            missing.append(message)
    
    if missing:
        return False, f"Password must contain {', '.join(missing)}"
    
    # Prevent common patterns
    password_lower = password.lower()
    common_patterns = ['password', '123456', 'qwerty', 'admin', 'letmein']
    if any(pattern in password_lower for pattern in common_patterns):
        return False, "Password contains common patterns"
    
    return True, ""

def sanitize_input(value: str) -> str:
    """
    Sanitize input by stripping whitespace and removing potential dangerous characters
    """
    if not value:
        return ""
    # Basic sanitization - remove null bytes and strip
    sanitized = value.replace('\x00', '').strip()
    return sanitized

def register_user(username: str, email: str, password: str) -> Dict[str, Any]:
    """
    Register a new user with password hashing
    Returns: Dictionary with success status and message
    """
    # Step 1: Sanitize inputs
    username = sanitize_input(username)
    email = sanitize_input(email).lower()
    password = sanitize_input(password)
    
    # Step 2: Validate all inputs
    is_valid, error_msg = validate_username(username)
    if not is_valid:
        return {"success": False, "message": "Registration failed. Please check your inputs."}
    
    is_valid, error_msg = validate_email(email)
    if not is_valid:
        return {"success": False, "message": "Registration failed. Please check your inputs."}
    
    is_valid, error_msg = validate_password_strength(password)
    if not is_valid:
        return {"success": False, "message": "Registration failed. Please check your inputs."}
    
    # Step 3: Hash password using bcrypt
    try:
        # Generate salt and hash password
        salt = bcrypt.gensalt(rounds=12)  # Use appropriate work factor
        password_hash = bcrypt.hashpw(password.encode('utf-8'), salt)
    except Exception as e:
        # Log the actual error for debugging (use proper logging in production)
        print(f"Password hashing error: {e}")
        return {"success": False, "message": "Registration failed. Please try again later."}
    
    # Step 4: Insert user with parameterized query
    conn = None
    try:
        conn = get_db_connection()
        
        # Parameterized query to prevent SQL injection
        conn.execute(
            'INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)',
            (username, email, password_hash.decode('utf-8'))
        )
        conn.commit()
        
        return {"success": True, "message": "Registration successful"}
        
    except sqlite3.IntegrityError:
        # Generic error message - doesn't reveal whether username or email exists
        return {"success": False, "message": "Registration failed. Please check your inputs."}
    except Exception as e:
        # Log the actual error for debugging
        print(f"Database error: {e}")
        return {"success": False, "message": "Registration failed. Please try again later."}
    finally:
        if conn:
            conn.close()

# Flask route example
@app.route('/register', methods=['POST'])
def registration_endpoint():
    """
    Flask endpoint for user registration
    Expects JSON: {"username": "...", "email": "...", "password": "..."}
    """
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({
                "success": False,
                "message": "Invalid request. JSON data required."
            }), 400
        
        username = data.get('username', '')
        email = data.get('email', '')
        password = data.get('password', '')
        
        # Register user
        result = register_user(username, email, password)
        
        # Return appropriate HTTP status code
        status_code = 201 if result['success'] else 400
        return jsonify(result), status_code
        
    except Exception as e:
        # Log the actual error (use proper logging)
        print(f"Endpoint error: {e}")
        return jsonify({
            "success": False,
            "message": "An unexpected error occurred"
        }), 500

# Alternative using Argon2 (commented)
"""
from argon2 import PasswordHasher
from argon2.exceptions import HashingError, VerificationError

ph = PasswordHasher()

# Instead of bcrypt.hashpw, use:
password_hash = ph.hash(password)

# Verification would be:
try:
    ph.verify(password_hash, password)
except VerificationError:
    # Invalid password
    pass
"""

if __name__ == '__main__':
    init_db()  # Initialize database
    app.run(debug=False)  # Set debug=False in production