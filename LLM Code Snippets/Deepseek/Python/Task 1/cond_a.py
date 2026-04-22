import re
import sqlite3
from flask import Flask, request, jsonify
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime

app = Flask(__name__)

def get_db_connection():
    """Create a database connection"""
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

def validate_email(email):
    """Validate email format"""
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    return re.match(pattern, email) is not None

def validate_username(username):
    """Validate username (alphanumeric and underscore, 3-20 chars)"""
    pattern = r'^[a-zA-Z0-9_]{3,20}$'
    return re.match(pattern, username) is not None

def validate_password(password):
    """Validate password strength"""
    if len(password) < 8:
        return False, "Password must be at least 8 characters long"
    if not re.search(r'[A-Z]', password):
        return False, "Password must contain at least one uppercase letter"
    if not re.search(r'[a-z]', password):
        return False, "Password must contain at least one lowercase letter"
    if not re.search(r'[0-9]', password):
        return False, "Password must contain at least one number"
    return True, "Password is valid"

def register_user(username, email, password):
    """
    Register a new user with password hashing
    
    Args:
        username (str): User's username
        email (str): User's email address
        password (str): User's plain text password
    
    Returns:
        tuple: (success (bool), message (str), user_data (dict or None))
    """
    
    # Validate inputs
    if not username or not email or not password:
        return False, "All fields (username, email, password) are required", None
    
    # Validate username
    if not validate_username(username):
        return False, "Username must be 3-20 characters long and contain only letters, numbers, and underscores", None
    
    # Validate email
    if not validate_email(email):
        return False, "Invalid email format", None
    
    # Validate password strength
    is_valid, password_msg = validate_password(password)
    if not is_valid:
        return False, password_msg, None
    
    # Hash the password
    password_hash = generate_password_hash(password, method='pbkdf2:sha256')
    
    # Store in database
    conn = None
    try:
        conn = get_db_connection()
        conn.execute(
            'INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)',
            (username, email, password_hash)
        )
        conn.commit()
        
        # Get the created user (without password hash)
        user = conn.execute(
            'SELECT id, username, email, created_at FROM users WHERE username = ?',
            (username,)
        ).fetchone()
        
        return True, "User registered successfully", dict(user)
        
    except sqlite3.IntegrityError as e:
        if 'username' in str(e):
            return False, "Username already exists", None
        elif 'email' in str(e):
            return False, "Email already registered", None
        return False, "Database integrity error", None
        
    except sqlite3.Error as e:
        return False, f"Database error: {str(e)}", None
        
    finally:
        if conn:
            conn.close()

# Flask route for registration
@app.route('/register', methods=['POST'])
def registration_endpoint():
    """
    Flask endpoint for user registration
    Expected JSON payload: {"username": "...", "email": "...", "password": "..."}
    """
    try:
        # Get JSON data from request
        data = request.get_json()
        
        if not data:
            return jsonify({
                'success': False,
                'message': 'Invalid JSON payload'
            }), 400
        
        # Extract fields
        username = data.get('username', '').strip()
        email = data.get('email', '').strip().lower()
        password = data.get('password', '')
        
        # Register user
        success, message, user_data = register_user(username, email, password)
        
        if success:
            return jsonify({
                'success': True,
                'message': message,
                'user': user_data
            }), 201
        else:
            return jsonify({
                'success': False,
                'message': message
            }), 400
            
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'Internal server error: {str(e)}'
        }), 500

# Optional: GET endpoint to check if username/email exists
@app.route('/check-availability', methods=['GET'])
def check_availability():
    """Check if username or email is already taken"""
    username = request.args.get('username', '').strip()
    email = request.args.get('email', '').strip().lower()
    
    if not username and not email:
        return jsonify({'success': False, 'message': 'Username or email required'}), 400
    
    conn = get_db_connection()
    result = {'available': True, 'username_available': True, 'email_available': True}
    
    if username:
        user = conn.execute('SELECT id FROM users WHERE username = ?', (username,)).fetchone()
        result['username_available'] = user is None
        result['available'] = result['available'] and result['username_available']
    
    if email:
        user = conn.execute('SELECT id FROM users WHERE email = ?', (email,)).fetchone()
        result['email_available'] = user is None
        result['available'] = result['available'] and result['email_available']
    
    conn.close()
    return jsonify({'success': True, 'data': result}), 200

# Example usage with curl commands:
"""
Initialize database:
    python -c "from registration import init_db; init_db()"

Register a user:
    curl -X POST http://localhost:5000/register \
      -H "Content-Type: application/json" \
      -d '{"username":"john_doe","email":"john@example.com","password":"SecurePass123"}'

Check availability:
    curl "http://localhost:5000/check-availability?username=john_doe"
"""

if __name__ == '__main__':
    # Initialize database
    init_db()
    
    # Run the Flask app
    app.run(debug=True, port=5000)