from flask import Blueprint, request, jsonify
from flask_jwt_extended import create_access_token
import bcrypt
from pymongo import MongoClient
import os
import re
import requests
from dotenv import load_dotenv

load_dotenv()

MONGO_URI = os.getenv("MONGO_URI")
ABSTRACT_API_KEY = os.getenv("ABSTRACT_API_KEY", "")  # Free API key

auth_bp = Blueprint('auth', __name__)

client = MongoClient(MONGO_URI)
db = client["codewhisperer"]
users = db["users"]

# Common disposable email domains to block
DISPOSABLE_DOMAINS = {
    '10minutemail.com', 'tempmail.com', 'guerrillamail.com', 'mailinator.com',
    'throwaway.email', 'temp-mail.org', 'getnada.com', 'maildrop.cc',
    'trashmail.com', 'yopmail.com', 'fakeinbox.com', 'sharklasers.com',
    'guerrillamailblock.com', 'pokemail.net', 'spam4.me', 'tempr.email',
    'throwawaymail.com', 'wegwerfemail.de', 'mintemail.com', 'mytrashmail.com'
}

def validate_email_format(email):
    """Basic email format validation"""
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    return re.match(pattern, email) is not None

def is_disposable_email(email):
    """Check if email is from a disposable domain"""
    domain = email.split('@')[1].lower() if '@' in email else ''
    return domain in DISPOSABLE_DOMAINS

def verify_email_with_api(email):
    """
    Verify email using AbstractAPI (free tier: 100 requests/month)
    Returns: (is_valid, error_message)
    """
    if not ABSTRACT_API_KEY:
        # Fallback to basic validation if no API key
        return validate_email_format(email), None
    
    try:
        url = f"https://emailvalidation.abstractapi.com/v1/"
        params = {
            'api_key': ABSTRACT_API_KEY,
            'email': email
        }
        
        response = requests.get(url, params=params, timeout=3)
        
        if response.status_code == 200:
            data = response.json()
            
            # Check various quality indicators
            is_valid_format = data.get('is_valid_format', {}).get('value', False)
            is_mx_found = data.get('is_mx_found', {}).get('value', False)
            is_smtp_valid = data.get('is_smtp_valid', {}).get('value', False)
            is_free_email = data.get('is_free_email', {}).get('value', False)
            is_disposable = data.get('is_disposable_email', {}).get('value', False)
            is_role_email = data.get('is_role_email', {}).get('value', False)  # e.g., admin@, info@
            
            # Strict validation
            if not is_valid_format:
                return False, "Invalid email format"
            
            if is_disposable:
                return False, "Disposable email addresses are not allowed"
            
            if not is_mx_found:
                return False, "Email domain does not exist"
            
            if is_smtp_valid is False:  # Explicitly False, not None
                return False, "Email address does not exist"
            
            # Optional: Block role emails (like admin@, support@)
            if is_role_email:
                return False, "Role-based email addresses are not allowed. Please use a personal email."
            
            return True, None
        else:
            # API failed, fallback to basic validation
            return validate_email_format(email), None
            
    except requests.exceptions.Timeout:
        # API timeout, fallback to basic validation
        return validate_email_format(email), None
    except Exception as e:
        print(f"Email validation API error: {str(e)}")
        # Fallback to basic validation
        return validate_email_format(email), None

@auth_bp.route("/register", methods=["POST"])
def register():
    data = request.json
    
    # Validate input
    username = data.get("username", "").strip()
    email = data.get("email", "").strip().lower()
    password = data.get("password", "")
    
    if not username or not email or not password:
        return jsonify({"error": "All fields are required"}), 400
    
    # Username validation
    if len(username) < 3:
        return jsonify({"error": "Username must be at least 3 characters"}), 400
    
    if len(username) > 30:
        return jsonify({"error": "Username must be less than 30 characters"}), 400
    
    # Password strength validation
    if len(password) < 8:
        return jsonify({"error": "Password must be at least 8 characters"}), 400
    
    # Basic email format check
    if not validate_email_format(email):
        return jsonify({"error": "Invalid email format"}), 400
    
    # Check disposable email (fast, local check)
    if is_disposable_email(email):
        return jsonify({"error": "Disposable email addresses are not allowed"}), 400
    
    # Check if user already exists
    if users.find_one({"username": username}):
        return jsonify({"error": "Username already taken"}), 400
    
    if users.find_one({"email": email}):
        return jsonify({"error": "Email already registered"}), 400
    
    # Verify email with API (with fallback)
    is_valid, error_message = verify_email_with_api(email)
    
    if not is_valid:
        return jsonify({"error": error_message or "Invalid email address"}), 400
    
    # Hash password and create user
    hashed_pw = bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt())
    users.insert_one({
        "username": username,
        "email": email,
        "password": hashed_pw,
        "created_at": __import__('datetime').datetime.utcnow()
    })
    
    token = create_access_token(identity=username)
    return jsonify({
        "token": token,
        "message": "Registration successful!"
    }), 201

@auth_bp.route("/login", methods=["POST"])
def login():
    data = request.json
    username = data.get("username", "").strip()
    password = data.get("password", "")
    
    if not username or not password:
        return jsonify({"error": "Username and password are required"}), 400
    
    user = users.find_one({"username": username})
    
    if not user:
        return jsonify({"error": "Invalid credentials"}), 401
    
    if not bcrypt.checkpw(password.encode("utf-8"), user["password"]):
        return jsonify({"error": "Invalid credentials"}), 401
    
    token = create_access_token(identity=username)
    return jsonify({"token": token, "message": "Login successful"})

@auth_bp.route("/validate-email", methods=["POST"])
def validate_email_endpoint():
    """
    Separate endpoint for real-time email validation (optional)
    """
    data = request.json
    email = data.get("email", "").strip().lower()
    
    if not email:
        return jsonify({"valid": False, "error": "Email is required"}), 400
    
    # Basic format check
    if not validate_email_format(email):
        return jsonify({"valid": False, "error": "Invalid email format"}), 200
    
    # Disposable check
    if is_disposable_email(email):
        return jsonify({"valid": False, "error": "Disposable emails not allowed"}), 200
    
    # Check if already registered
    if users.find_one({"email": email}):
        return jsonify({"valid": False, "error": "Email already registered"}), 200
    
    # API validation
    is_valid, error_message = verify_email_with_api(email)
    
    if not is_valid:
        return jsonify({"valid": False, "error": error_message}), 200
    
    return jsonify({"valid": True, "message": "Email is valid"}), 200
