from flask import Flask, request, session, jsonify, make_response
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from werkzeug.security import check_password_hash
import os

app = Flask(__name__)
app.secret_key = os.environ.get("FLASK_SECRET_KEY", "fallback-very-secure-key")

# 1. Configure Session Security (Cookies)
app.config.update(
    SESSION_COOKIE_SECURE=True,      # Only send over HTTPS
    SESSION_COOKIE_HTTPONLY=True,    # Prevent JavaScript access (XSS protection)
    SESSION_COOKIE_SAMESITE='Strict' # Prevent CSRF
)

# 2. Implement Rate Limiting (5 failed attempts per IP)
limiter = Limiter(
    get_remote_address,
    app=app,
    default_limits=["200 per day", "50 per hour"]
)

def get_user_from_db(username):
    """
    Mock database lookup. 
    In production, use a parameterized SQL query.
    """
    # Example: User 'admin' exists with a hashed password
    # hash for 'password123'
    db = {
        "admin": "pbkdf2:sha256:600000$uGvI9V8z$5a3..." 
    }
    return db.get(username)

@app.route('/login', methods=['POST'])
@limiter.limit("5 per minute") # Specific rate limit for the login route
def login():
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')

    # Generic error message to prevent username enumeration
    error_message = "Invalid username or password."

    user_password_hash = get_user_from_db(username)

    # 3. Constant-time comparison & Generic Failure
    # check_password_hash handles timing attack mitigation internally
    if user_password_hash and check_password_hash(user_password_hash, password):
        
        # 4. Prevent Session Fixation
        # Clearing and re-mapping the session forces a new session ID
        session.clear()
        session['user_id'] = username
        session.permanent = True # Use app.config['PERMANENT_SESSION_LIFETIME']
        
        return jsonify({"status": "success", "message": "Login successful"}), 200

    return jsonify({"status": "failure", "message": error_message}), 401