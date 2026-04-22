from flask import Flask, request, jsonify, session, make_response
from functools import wraps
import hashlib
import secrets
from datetime import datetime, timedelta
import sqlite3
from contextlib import contextmanager

app = Flask(__name__)
app.config['SECRET_KEY'] = 'your-secret-key-here-change-in-production'  # Use environment variable in production
app.config['SESSION_COOKIE_SECURE'] = True  # Use HTTPS in production
app.config['SESSION_COOKIE_HTTPONLY'] = True
app.config['SESSION_COOKIE_SAMESITE'] = 'Lax'
app.config['PERMANENT_SESSION_LIFETIME'] = timedelta(hours=24)

# Database setup (using SQLite for example)
def init_db():
    """Initialize the database with users table"""
    with get_db() as conn:
        conn.execute('''
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                last_login TIMESTAMP
            )
        ''')
        
        # Create index for faster lookups
        conn.execute('CREATE INDEX IF NOT EXISTS idx_username ON users(username)')
        conn.commit()

@contextmanager
def get_db():
    """Database connection context manager"""
    conn = sqlite3.connect('users.db')
    conn.row_factory = sqlite3.Row
    try:
        yield conn
    finally:
        conn.close()

def hash_password(password: str) -> str:
    """Hash a password using SHA-256 with salt"""
    salt = secrets.token_hex(16)
    hash_obj = hashlib.sha256((password + salt).encode())
    return f"{salt}:{hash_obj.hexdigest()}"

def verify_password(password: str, stored_hash: str) -> bool:
    """Verify a password against its stored hash"""
    salt, hash_value = stored_hash.split(':')
    hash_obj = hashlib.sha256((password + salt).encode())
    return hash_obj.hexdigest() == hash_value

def login_required(f):
    """Decorator to protect routes that require authentication"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'user_id' not in session:
            return jsonify({'error': 'Authentication required'}), 401
        return f(*args, **kwargs)
    return decorated_function

@app.route('/api/login', methods=['POST'])
def login():
    """
    User login endpoint
    Expected JSON payload: {"username": "user", "password": "pass"}
    """
    try:
        # Get request data
        data = request.get_json()
        
        if not data:
            return jsonify({'error': 'Invalid request. JSON payload required'}), 400
        
        username = data.get('username', '').strip()
        password = data.get('password', '')
        
        # Validate input
        if not username or not password:
            return jsonify({'error': 'Username and password are required'}), 400
        
        # Query database for user
        with get_db() as conn:
            user = conn.execute(
                'SELECT id, username, password_hash FROM users WHERE username = ?',
                (username,)
            ).fetchone()
            
            # Verify credentials
            if user and verify_password(password, user['password_hash']):
                # Create user session
                session.clear()  # Clear any existing session
                session['user_id'] = user['id']
                session['username'] = user['username']
                session['login_time'] = datetime.now().isoformat()
                session.permanent = True  # Make session permanent (uses PERMANENT_SESSION_LIFETIME)
                
                # Update last login timestamp
                conn.execute(
                    'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?',
                    (user['id'],)
                )
                conn.commit()
                
                # Return success response
                return jsonify({
                    'success': True,
                    'message': 'Login successful',
                    'user': {
                        'id': user['id'],
                        'username': user['username']
                    }
                }), 200
            else:
                # Failed login
                return jsonify({
                    'success': False,
                    'error': 'Invalid username or password'
                }), 401
                
    except Exception as e:
        app.logger.error(f"Login error: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500

@app.route('/api/logout', methods=['POST'])
@login_required
def logout():
    """User logout endpoint"""
    session.clear()
    return jsonify({'message': 'Logout successful'}), 200

@app.route('/api/session', methods=['GET'])
@login_required
def get_session():
    """Get current session information"""
    return jsonify({
        'authenticated': True,
        'user': {
            'id': session.get('user_id'),
            'username': session.get('username')
        },
        'login_time': session.get('login_time')
    }), 200

@app.route('/api/register', methods=['POST'])
def register():
    """
    User registration endpoint (for testing/example)
    Expected JSON payload: {"username": "user", "password": "pass"}
    """
    try:
        data = request.get_json()
        username = data.get('username', '').strip()
        password = data.get('password', '')
        
        if not username or not password:
            return jsonify({'error': 'Username and password are required'}), 400
        
        if len(password) < 6:
            return jsonify({'error': 'Password must be at least 6 characters'}), 400
        
        password_hash = hash_password(password)
        
        with get_db() as conn:
            try:
                conn.execute(
                    'INSERT INTO users (username, password_hash) VALUES (?, ?)',
                    (username, password_hash)
                )
                conn.commit()
                return jsonify({'message': 'User registered successfully'}), 201
            except sqlite3.IntegrityError:
                return jsonify({'error': 'Username already exists'}), 409
                
    except Exception as e:
        app.logger.error(f"Registration error: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500

# Example of a protected route
@app.route('/api/dashboard', methods=['GET'])
@login_required
def dashboard():
    """Example protected endpoint"""
    return jsonify({
        'message': f'Welcome {session["username"]}! This is your dashboard.',
        'user_data': {
            'user_id': session['user_id'],
            'username': session['username']
        }
    }), 200

# Initialize database and run app
if __name__ == '__main__':
    init_db()
    
    # Create a test user (remove in production)
    with get_db() as conn:
        test_user = conn.execute('SELECT * FROM users WHERE username = "testuser"').fetchone()
        if not test_user:
            conn.execute(
                'INSERT INTO users (username, password_hash) VALUES (?, ?)',
                ('testuser', hash_password('testpass123'))
            )
            conn.commit()
            print("Test user created: username='testuser', password='testpass123'")
    
    app.run(debug=True, host='0.0.0.0', port=5000)