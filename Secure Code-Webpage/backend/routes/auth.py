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
from extensions import limiter  # FIX: shared limiter instance

load_dotenv()

MONGO_URI = os.getenv("MONGO_URI")
ABSTRACT_API_KEY = os.getenv("ABSTRACT_API_KEY", "")
RESEND_API_KEY = os.getenv("RESEND_API_KEY", "")
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")
BREVO_API_KEY = os.getenv("BREVO_API_KEY", "")
auth_bp = Blueprint('auth', __name__)

client = MongoClient(MONGO_URI)
db = client["codewhisperer"]
users = db["users"]
reset_tokens = db["reset_tokens"]

DISPOSABLE_DOMAINS = {
    '10minutemail.com', 'tempmail.com', 'guerrillamail.com', 'mailinator.com',
    'throwaway.email', 'temp-mail.org', 'getnada.com', 'maildrop.cc',
    'trashmail.com', 'yopmail.com', 'fakeinbox.com', 'sharklasers.com',
    'guerrillamailblock.com', 'pokemail.net', 'spam4.me', 'tempr.email',
    'throwawaymail.com', 'wegwerfemail.de', 'mintemail.com', 'mytrashmail.com'
}

def validate_email_format(email):
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    return re.match(pattern, email) is not None

def is_disposable_email(email):
    domain = email.split('@')[1].lower() if '@' in email else ''
    return domain in DISPOSABLE_DOMAINS

def verify_email_with_api(email):
    if not ABSTRACT_API_KEY:
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

            is_valid_format = data.get('is_valid_format', {}).get('value', False)
            is_mx_found = data.get('is_mx_found', {}).get('value', False)
            is_smtp_valid = data.get('is_smtp_valid', {}).get('value', False)
            is_free_email = data.get('is_free_email', {}).get('value', False)
            is_disposable = data.get('is_disposable_email', {}).get('value', False)
            is_role_email = data.get('is_role_email', {}).get('value', False)

            if not is_valid_format:
                return False, "Invalid email format"

            if is_disposable:
                return False, "Disposable email addresses are not allowed"

            if not is_mx_found:
                return False, "Email domain does not exist"

            if is_smtp_valid is False:
                return False, "Email address does not exist"

            if is_role_email:
                return False, "Role-based email addresses are not allowed. Please use a personal email."

            return True, None
        else:
            return validate_email_format(email), None

    except requests.exceptions.Timeout:
        return validate_email_format(email), None
    except Exception as e:
        print(f"Email validation API error: {str(e)}")
        return validate_email_format(email), None

# FIX: Added rate limiting to prevent account enumeration / spam
@auth_bp.route("/register", methods=["POST"])
@limiter.limit("5/minute")
def register():
    data = request.json

    username = data.get("username", "").strip()
    email = data.get("email", "").strip().lower()
    password = data.get("password", "")

    if not username or not email or not password:
        return jsonify({"error": "All fields are required"}), 400

    if len(username) < 3:
        return jsonify({"error": "Username must be at least 3 characters"}), 400

    if len(username) > 30:
        return jsonify({"error": "Username must be less than 30 characters"}), 400

    if len(password) < 8:
        return jsonify({"error": "Password must be at least 8 characters"}), 400

    if not validate_email_format(email):
        return jsonify({"error": "Invalid email format"}), 400

    if is_disposable_email(email):
        return jsonify({"error": "Disposable email addresses are not allowed"}), 400

    if users.find_one({"username": username}):
        return jsonify({"error": "Username already taken"}), 400

    if users.find_one({"email": email}):
        return jsonify({"error": "Email already registered"}), 400

    is_valid, error_message = verify_email_with_api(email)

    if not is_valid:
        return jsonify({"error": error_message or "Invalid email address"}), 400

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

# FIX: Added rate limiting to prevent brute-force password attacks
@auth_bp.route("/login", methods=["POST"])
@limiter.limit("10/minute")
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

# FIX: Added rate limiting
@auth_bp.route("/validate-email", methods=["POST"])
@limiter.limit("20/minute")
def validate_email_endpoint():
    data = request.json
    email = data.get("email", "").strip().lower()

    if not email:
        return jsonify({"valid": False, "error": "Email is required"}), 400

    if not validate_email_format(email):
        return jsonify({"valid": False, "error": "Invalid email format"}), 200

    if is_disposable_email(email):
        return jsonify({"valid": False, "error": "Disposable emails not allowed"}), 200

    if users.find_one({"email": email}):
        return jsonify({"valid": False, "error": "Email already registered"}), 200

    is_valid, error_message = verify_email_with_api(email)

    if not is_valid:
        return jsonify({"valid": False, "error": error_message}), 200

    return jsonify({"valid": True, "message": "Email is valid"}), 200

def send_reset_email(email, reset_token, username):
    if not BREVO_API_KEY:
        print("⚠️ Warning: BREVO_API_KEY not set, email not sent")
        return False

    try:
        reset_link = f"{FRONTEND_URL}/reset-password?token={reset_token}"

        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
                body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f5f5f5; }}
                .container {{ max-width: 600px; margin: 20px auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); }}
                .header {{ background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); color: white; padding: 40px 30px; text-align: center; }}
                .header h1 {{ margin: 0; font-size: 28px; font-weight: 700; }}
                .content {{ padding: 40px 30px; background: white; }}
                .content p {{ margin: 0 0 16px 0; font-size: 16px; color: #4b5563; }}
                .button-container {{ text-align: center; margin: 30px 0; }}
                .button {{ display: inline-block; background: #2563eb; color: white !important; padding: 16px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; }}
                .link-box {{ background: #f3f4f6; padding: 16px; border-radius: 8px; word-break: break-all; font-size: 14px; color: #6b7280; margin: 20px 0; }}
                .warning {{ background: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px; margin: 24px 0; border-radius: 4px; }}
                .warning strong {{ color: #92400e; display: block; margin-bottom: 8px; }}
                .warning ul {{ margin: 8px 0 0 0; padding-left: 20px; color: #78350f; }}
                .warning li {{ margin: 4px 0; }}
                .footer {{ text-align: center; padding: 24px 30px; background: #f9fafb; color: #6b7280; font-size: 13px; border-top: 1px solid #e5e7eb; }}
                .footer p {{ margin: 4px 0; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header"><h1>🔐 Password Reset Request</h1></div>
                <div class="content">
                    <p>Hi <strong>{username}</strong>,</p>
                    <p>We received a request to reset your password for your <strong>AI Code Security</strong> account.</p>
                    <p>Click the button below to create a new password:</p>
                    <div class="button-container"><a href="{reset_link}" class="button">Reset My Password</a></div>
                    <p style="font-size: 14px; color: #6b7280;">Or copy and paste this link into your browser:</p>
                    <div class="link-box">{reset_link}</div>
                    <div class="warning">
                        <strong>⚠️ Security Notice:</strong>
                        <ul>
                            <li>This link will expire in <strong>1 hour</strong></li>
                            <li>If you didn't request this, please ignore this email</li>
                            <li>Never share this link with anyone</li>
                        </ul>
                    </div>
                    <p style="margin-top: 24px;">Best regards,<br><strong>AI Code Security Team</strong></p>
                </div>
                <div class="footer">
                    <p>This is an automated message, please do not reply to this email.</p>
                    <p>&copy; 2025 AI Code Security. All rights reserved.</p>
                </div>
            </div>
        </body>
        </html>
        """

        text_content = f"""
        Password Reset Request

        Hi {username},

        We received a request to reset your password for your AI Code Security account.

        Click this link to reset your password:
        {reset_link}

        This link will expire in 1 hour.

        If you didn't request this, please ignore this email. Your account is safe.

        Best regards,
        AI Code Security Team
        """

        url = "https://api.brevo.com/v3/smtp/email"
        headers = {
            "accept": "application/json",
            "api-key": BREVO_API_KEY,
            "content-type": "application/json"
        }

        payload = {
            "sender": {"name": "AI Code Security", "email": "bihanbanerjee26@gmail.com"},
            "to": [{"email": email, "name": username}],
            "subject": "Reset Your Password - AI Code Security",
            "htmlContent": html_content,
            "textContent": text_content
        }

        response = requests.post(url, json=payload, headers=headers, timeout=10)

        if response.status_code in [200, 201]:
            print(f"✅ Reset email sent successfully to {email}")
            print(f"📧 Message ID: {response.json().get('messageId', 'N/A')}")
            return True
        else:
            print(f"❌ Failed to send email: {response.status_code}")
            print(f"❌ Response: {response.text}")
            return False

    except requests.exceptions.Timeout:
        print("❌ Email sending timeout")
        return False
    except Exception as e:
        print(f"❌ Email sending error: {str(e)}")
        return False


# FIX: Added rate limiting to prevent email bombing
@auth_bp.route("/forgot-password", methods=["POST"])
@limiter.limit("3/minute")
def forgot_password():
    data = request.json
    email = data.get("email", "").strip().lower()

    if not email:
        return jsonify({"error": "Email is required"}), 400

    if not validate_email_format(email):
        return jsonify({"error": "Invalid email format"}), 400

    user = users.find_one({"email": email})

    if user:
        reset_token = secrets.token_urlsafe(32)

        reset_tokens.insert_one({
            "email": email,
            "token": reset_token,
            "created_at": datetime.utcnow(),
            "expires_at": datetime.utcnow() + timedelta(hours=1),
            "used": False
        })

        send_reset_email(email, reset_token, user["username"])

    return jsonify({
        "message": "If an account exists with that email, a password reset link has been sent."
    }), 200

# FIX: Added rate limiting; removed email from response to prevent info leak
@auth_bp.route("/verify-reset-token", methods=["POST"])
@limiter.limit("10/minute")
def verify_reset_token():
    data = request.json
    token = data.get("token", "")

    if not token:
        return jsonify({"valid": False, "error": "Token is required"}), 400

    token_doc = reset_tokens.find_one({
        "token": token,
        "used": False
    })

    if not token_doc:
        return jsonify({"valid": False, "error": "Invalid or expired token"}), 400

    if datetime.utcnow() > token_doc["expires_at"]:
        return jsonify({"valid": False, "error": "Token has expired"}), 400

    # FIX: Do not return the email — it was an information leak
    return jsonify({"valid": True}), 200

# FIX: Added rate limiting
@auth_bp.route("/reset-password", methods=["POST"])
@limiter.limit("5/minute")
def reset_password():
    data = request.json
    token = data.get("token", "")
    new_password = data.get("password", "")

    if not token or not new_password:
        return jsonify({"error": "Token and new password are required"}), 400

    if len(new_password) < 8:
        return jsonify({"error": "Password must be at least 8 characters"}), 400

    token_doc = reset_tokens.find_one({
        "token": token,
        "used": False
    })

    if not token_doc:
        return jsonify({"error": "Invalid or expired reset token"}), 400

    if datetime.utcnow() > token_doc["expires_at"]:
        return jsonify({"error": "Reset token has expired"}), 400

    hashed_pw = bcrypt.hashpw(new_password.encode("utf-8"), bcrypt.gensalt())

    users.update_one(
        {"email": token_doc["email"]},
        {"$set": {"password": hashed_pw, "updated_at": datetime.utcnow()}}
    )

    reset_tokens.update_one(
        {"_id": token_doc["_id"]},
        {"$set": {"used": True, "used_at": datetime.utcnow()}}
    )

    return jsonify({"message": "Password reset successfully!"}), 200