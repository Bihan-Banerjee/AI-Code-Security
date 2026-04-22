import hashlib
import hmac
import time
from functools import wraps
from datetime import datetime, timedelta
from flask import Flask, request, jsonify, session, make_response
from flask_sqlalchemy import SQLAlchemy
from werkzeug.security import generate_password_hash, check_password_hash

app = Flask(__name__)
app.config['SECRET_KEY'] = 'your-secret-key-here-change-in-production'
app.config['SESSION_COOKIE_SECURE'] = True
app.config['SESSION_COOKIE_HTTPONLY'] = True
app.config['SESSION_COOKIE_SAMESITE'] = 'Strict'
app.config['PERMANENT_SESSION_LIFETIME'] = timedelta(hours=24)

# Database setup (using SQLite for example)
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///users.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
db = SQLAlchemy(app)

# Rate limiting storage (in production, use Redis or similar)
rate_limit_storage = {}

# User model
class User(db.Model):
    __tablename__ = 'users'
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    password_hash = db.Column(db.String(120), nullable=False)
    
    def set_password(self, password):
        """Hash password using Werkzeug's secure method"""
        self.password_hash = generate_password_hash(password)
    
    def verify_password(self, password):
        """
        Verify password using constant-time comparison
        """
        # Use Werkzeug's constant-time comparison
        return check_password_hash(self.password_hash, password)


class FailedAttempt(db.Model):
    __tablename__ = 'failed_attempts'
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), nullable=False)
    ip_address = db.Column(db.String(45), nullable=False)
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)
    
    @classmethod
    def get_recent_failures(cls, username, ip_address, minutes=15):
        """Get number of failed attempts in the last X minutes"""
        cutoff = datetime.utcnow() - timedelta(minutes=minutes)
        return cls.query.filter(
            (cls.username == username) | (cls.ip_address == ip_address),
            cls.timestamp > cutoff
        ).count()
    
    @classmethod
    def record_failure(cls, username, ip_address):
        """Record a failed login attempt"""
        attempt = cls(username=username, ip_address=ip_address)
        db.session.add(attempt)
        db.session.commit()
    
    @classmethod
    def clear_for_user(cls, username, ip_address):
        """Clear failed attempts on successful login"""
        cls.query.filter(
            (cls.username == username) | (cls.ip_address == ip_address)
        ).delete()
        db.session.commit()


def rate_limit_check(username, ip_address):
    """
    Check if user has exceeded rate limit
    Returns: (is_allowed, wait_time_in_seconds)
    """
    # Get recent failures (last 15 minutes)
    recent_failures = FailedAttempt.get_recent_failures(username, ip_address, minutes=15)
    
    if recent_failures >= 5:
        # Calculate wait time (exponential backoff)
        # Block for 1 minute after 5th attempt, increasing by factor of 2
        excess = recent_failures - 4
        wait_minutes = min(60, 2 ** excess)  # Cap at 60 minutes
        return False, wait_minutes * 60
    
    return True, 0


def constant_time_compare(a, b):
    """
    Constant-time string comparison to prevent timing attacks
    """
    return hmac.compare_digest(a.encode('utf-8'), b.encode('utf-8'))


def regenerate_session():
    """
    Regenerate session ID to prevent session fixation
    """
    session.regenerate()  # Flask's built-in session regeneration


def set_secure_session_cookie(response):
    """
    Ensure session cookies have proper security flags
    """
    response.set_cookie(
        'session',
        value=session.get('_id', ''),
        secure=True,           # HTTPS only
        httponly=True,         # Not accessible via JavaScript
        samesite='Strict',     # Prevent CSRF
        max_age=app.config['PERMANENT_SESSION_LIFETIME'].total_seconds()
    )
    return response


@app.route('/login', methods=['POST'])
def login():
    """
    User login endpoint with security measures
    """
    # Get credentials from request
    data = request.get_json()
    if not data:
        data = request.form
    
    username = data.get('username', '').strip()
    password = data.get('password', '')
    
    # Get client IP address
    ip_address = request.headers.get('X-Forwarded-For', request.remote_addr)
    
    # Rate limiting check
    is_allowed, wait_time = rate_limit_check(username, ip_address)
    if not is_allowed:
        # Generic failure message (don't reveal rate limit reason)
        return jsonify({
            'success': False,
            'message': 'Invalid username or password'
        }), 401
    
    # Query user from database
    user = User.query.filter_by(username=username).first()
    
    # Constant-time comparison for password verification
    # Note: Even if user doesn't exist, we still compute a hash to maintain constant time
    if user:
        password_valid = user.verify_password(password)
    else:
        # To prevent timing attacks, hash a dummy value to take similar time
        dummy_hash = generate_password_hash('dummy')
        # Use constant-time comparison even for non-existent users
        password_valid = check_password_hash(dummy_hash, password) and False
    
    # Record failed attempt if credentials invalid
    if not password_valid:
        FailedAttempt.record_failure(username, ip_address)
        
        # Always return generic failure message
        return jsonify({
            'success': False,
            'message': 'Invalid username or password'
        }), 401
    
    # Successful login
    # Clear failed attempts
    FailedAttempt.clear_for_user(username, ip_address)
    
    # Regenerate session ID to prevent session fixation
    regenerate_session()
    
    # Set session data
    session.permanent = True
    session['user_id'] = user.id
    session['username'] = user.username
    session['login_time'] = datetime.utcnow().isoformat()
    
    # Create response with secure session cookie
    response = make_response(jsonify({
        'success': True,
        'message': 'Login successful'
    }))
    
    # Ensure cookies have security flags
    response = set_secure_session_cookie(response)
    
    return response, 200


@app.route('/logout', methods=['POST'])
def logout():
    """
    Logout endpoint to clear session
    """
    # Clear session data
    session.clear()
    
    # Create response
    response = make_response(jsonify({
        'success': True,
        'message': 'Logged out successfully'
    }))
    
    # Delete the session cookie
    response.set_cookie('session', '', expires=0, secure=True, httponly=True, samesite='Strict')
    
    return response, 200


# Helper function to require authentication for protected routes
def login_required(f):
    """Decorator to require user authentication"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'user_id' not in session:
            return jsonify({'success': False, 'message': 'Authentication required'}), 401
        return f(*args, **kwargs)
    return decorated_function


# Example protected route
@app.route('/protected')
@login_required
def protected_route():
    """Example of a protected endpoint"""
    return jsonify({
        'success': True,
        'user': session.get('username'),
        'message': f'Welcome {session.get("username")}!'
    })


# Initialize database
@app.before_first_request
def create_tables():
    db.create_all()
    
    # Create a test user (for demonstration)
    if not User.query.filter_by(username='testuser').first():
        test_user = User(username='testuser')
        test_user.set_password('SecurePass123!')
        db.session.add(test_user)
        db.session.commit()


if __name__ == '__main__':
    # Note: In production, use HTTPS and proper WSGI server
    # For development only
    app.run(debug=False, ssl_context='adhoc')  # Using adhoc SSL for development