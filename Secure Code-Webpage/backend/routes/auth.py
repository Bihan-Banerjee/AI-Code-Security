from flask import Blueprint, request, jsonify
from flask_jwt_extended import create_access_token
import bcrypt
from pymongo import MongoClient
import os
import re
import requests
from dotenv import load_dotenv
import secrets
from datetime import datetime, timedelta

load_dotenv()

MONGO_URI = os.getenv("MONGO_URI")
ABSTRACT_API_KEY = os.getenv("ABSTRACT_API_KEY", "")  
RESEND_API_KEY = os.getenv("RESEND_API_KEY", "") 
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")
auth_bp = Blueprint('auth', __name__)

client = MongoClient(MONGO_URI)
db = client["codewhisperer"]
users = db["users"]
reset_tokens = db["reset_tokens"]

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

def send_reset_email(email, reset_token, username):
    """
    Send password reset email using Resend API
    """
    if not RESEND_API_KEY:
        print("Warning: RESEND_API_KEY not set, email not sent")
        return False
    
    try:
        reset_link = f"{FRONTEND_URL}/reset-password?token={reset_token}"
        
        # HTML email template
        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                .header {{ background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); 
                          color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }}
                .content {{ background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }}
                .button {{ display: inline-block; background: #2563eb; color: white; 
                          padding: 14px 28px; text-decoration: none; border-radius: 8px; 
                          font-weight: bold; margin: 20px 0; }}
                .footer {{ text-align: center; margin-top: 20px; color: #6b7280; font-size: 12px; }}
                .warning {{ background: #fef3c7; border-left: 4px solid #f59e0b; 
                           padding: 12px; margin: 20px 0; border-radius: 4px; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>🔐 Password Reset Request</h1>
                </div>
                <div class="content">
                    <p>Hi <strong>{username}</strong>,</p>
                    
                    <p>We received a request to reset your password for your AI Code Security account.</p>
                    
                    <p>Click the button below to reset your password:</p>
                    
                    <center>
                        <a href="{reset_link}" class="button">Reset My Password</a>
                    </center>
                    
                    <p>Or copy and paste this link into your browser:</p>
                    <p style="background: #e5e7eb; padding: 10px; border-radius: 4px; word-break: break-all;">
                        {reset_link}
                    </p>
                    
                    <div class="warning">
                        <strong>⚠️ Security Notice:</strong>
                        <ul>
                            <li>This link will expire in <strong>1 hour</strong></li>
                            <li>If you didn't request this, please ignore this email</li>
                            <li>Never share this link with anyone</li>
                        </ul>
                    </div>
                    
                    <p>If you didn't request a password reset, your account is still secure and you can safely ignore this email.</p>
                    
                    <p>Best regards,<br><strong>AI Code Security Team</strong></p>
                </div>
                <div class="footer">
                    <p>This is an automated message, please do not reply.</p>
                    <p>&copy; 2025 AI Code Security. All rights reserved.</p>
                </div>
            </div>
        </body>
        </html>
        """
        
        # Send via Resend API
        url = "https://api.resend.com/emails"
        headers = {
            "Authorization": f"Bearer {RESEND_API_KEY}",
            "Content-Type": "application/json"
        }
        data = {
            "from": "AI Code Security <onboarding@resend.dev>",  
            "to": [email],
            "subject": "Reset Your Password - AI Code Security",
            "html": html_content
        }
        
        response = requests.post(url, json=data, headers=headers, timeout=10)
        
        if response.status_code == 200:
            print(f"Reset email sent successfully to {email}")
            return True
        else:
            print(f"Failed to send email: {response.text}")
            return False
            
    except Exception as e:
        print(f"Email sending error: {str(e)}")
        return False

@auth_bp.route("/forgot-password", methods=["POST"])
def forgot_password():
    """
    Request password reset - generates token and sends email
    """
    data = request.json
    email = data.get("email", "").strip().lower()
    
    if not email:
        return jsonify({"error": "Email is required"}), 400
    
    if not validate_email_format(email):
        return jsonify({"error": "Invalid email format"}), 400
    
    # Find user by email
    user = users.find_one({"email": email})
    
    # Always return success to prevent email enumeration
    # But only send email if user exists
    if user:
        # Generate secure random token
        reset_token = secrets.token_urlsafe(32)
        
        # Store token with expiration (1 hour)
        reset_tokens.insert_one({
            "email": email,
            "token": reset_token,
            "created_at": datetime.utcnow(),
            "expires_at": datetime.utcnow() + timedelta(hours=1),
            "used": False
        })
        
        # Send email
        send_reset_email(email, reset_token, user["username"])
    
    # Always return success message (security best practice)
    return jsonify({
        "message": "If an account exists with that email, a password reset link has been sent."
    }), 200

@auth_bp.route("/verify-reset-token", methods=["POST"])
def verify_reset_token():
    """
    Verify if reset token is valid
    """
    data = request.json
    token = data.get("token", "")
    
    if not token:
        return jsonify({"valid": False, "error": "Token is required"}), 400
    
    # Find token in database
    token_doc = reset_tokens.find_one({
        "token": token,
        "used": False
    })
    
    if not token_doc:
        return jsonify({"valid": False, "error": "Invalid or expired token"}), 400
    
    # Check if token is expired
    if datetime.utcnow() > token_doc["expires_at"]:
        return jsonify({"valid": False, "error": "Token has expired"}), 400
    
    return jsonify({"valid": True, "email": token_doc["email"]}), 200

@auth_bp.route("/reset-password", methods=["POST"])
def reset_password():
    """
    Reset password using valid token
    """
    data = request.json
    token = data.get("token", "")
    new_password = data.get("password", "")
    
    if not token or not new_password:
        return jsonify({"error": "Token and new password are required"}), 400
    
    # Validate password strength
    if len(new_password) < 8:
        return jsonify({"error": "Password must be at least 8 characters"}), 400
    
    # Find valid token
    token_doc = reset_tokens.find_one({
        "token": token,
        "used": False
    })
    
    if not token_doc:
        return jsonify({"error": "Invalid or expired reset token"}), 400
    
    # Check expiration
    if datetime.utcnow() > token_doc["expires_at"]:
        return jsonify({"error": "Reset token has expired"}), 400
    
    # Hash new password
    hashed_pw = bcrypt.hashpw(new_password.encode("utf-8"), bcrypt.gensalt())
    
    # Update user password
    users.update_one(
        {"email": token_doc["email"]},
        {"$set": {"password": hashed_pw, "updated_at": datetime.utcnow()}}
    )
    
    # Mark token as used
    reset_tokens.update_one(
        {"_id": token_doc["_id"]},
        {"$set": {"used": True, "used_at": datetime.utcnow()}}
    )
    
    return jsonify({"message": "Password reset successfully!"}), 200
