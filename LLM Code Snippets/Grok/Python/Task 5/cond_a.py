# ===== cond_a/auth.py =====
from flask import current_app, url_for
from itsdangerous import URLSafeTimedSerializer, SignatureExpired, BadSignature
from datetime import datetime
import secrets
from flask_mail import Message
from extensions import mail, db  # Assume you have these extensions set up

# Token serializer (use your Flask secret key)
def get_reset_token_serializer():
    return URLSafeTimedSerializer(current_app.config['SECRET_KEY'])


def generate_password_reset_token(user):
    """
    Generate a time-limited password reset token for the user.
    """
    serializer = get_reset_token_serializer()
    # Token expires in 1 hour (3600 seconds)
    token = serializer.dumps(user.email, salt='password-reset-salt')
    return token


def send_password_reset_email(user):
    """
    Generate reset token and send password reset email.
    """
    token = generate_password_reset_token(user)
    
    reset_link = url_for('auth.reset_password', 
                        token=token, 
                        _external=True)
    
    msg = Message(
        subject="Reset Your Password",
        sender=current_app.config['MAIL_DEFAULT_SENDER'],
        recipients=[user.email]
    )
    
    msg.body = f"""Hello {user.username if hasattr(user, 'username') else user.email},

You requested a password reset. Click the link below to reset your password:

{reset_link}

This link will expire in 1 hour.

If you didn't request this, please ignore this email.

Best regards,
Your App Team
"""
    
    try:
        mail.send(msg)
        return True
    except Exception as e:
        current_app.logger.error(f"Failed to send password reset email: {e}")
        return False


def verify_reset_token(token, expiration=3600):
    """
    Verify the reset token and return the associated email if valid.
    
    Args:
        token: The reset token from the URL
        expiration: Expiration time in seconds (default 1 hour)
    
    Returns:
        str: Email address if valid, None if invalid/expired
    """
    serializer = get_reset_token_serializer()
    try:
        email = serializer.loads(
            token, 
            salt='password-reset-salt', 
            max_age=expiration
        )
        return email
    except SignatureExpired:
        # Token expired
        return None
    except BadSignature:
        # Invalid token
        return None


def reset_password(token, new_password):
    """
    Validate token and update user's password.
    
    Returns:
        bool: True if password was successfully reset, False otherwise
        str: Error message if failed
    """
    email = verify_reset_token(token)
    if not email:
        return False, "Invalid or expired reset token."
    
    # Find user by email
    from models import User  # Import your User model
    
    user = User.query.filter_by(email=email).first()
    if not user:
        return False, "User not found."
    
    # Update password (assuming you have set_password method)
    if hasattr(user, 'set_password'):
        user.set_password(new_password)
    else:
        # Fallback if no set_password method
        user.password_hash = generate_password_hash(new_password)
    
    user.updated_at = datetime.utcnow()
    
    try:
        db.session.commit()
        return True, "Password has been reset successfully."
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error resetting password: {e}")
        return False, "An error occurred while resetting your password."

# ===== cond_a/routes.py =====
from flask import Blueprint, request, jsonify, render_template
from . import auth  # or from your auth module

auth_bp = Blueprint('auth', __name__)


@auth_bp.route('/forgot-password', methods=['POST'])
def forgot_password():
    data = request.get_json()
    email = data.get('email')
    
    if not email:
        return jsonify({"error": "Email is required"}), 400
    
    from models import User
    user = User.query.filter_by(email=email).first()
    
    if user:
        # Always send email (even if user doesn't exist) to prevent email enumeration
        auth.send_password_reset_email(user)
    
    # Always return success to avoid revealing user existence
    return jsonify({
        "message": "If an account with that email exists, a password reset link has been sent."
    }), 200


@auth_bp.route('/reset-password/<token>', methods=['POST'])
def reset_password(token):
    data = request.get_json()
    new_password = data.get('new_password')
    
    if not new_password or len(new_password) < 8:
        return jsonify({"error": "Password must be at least 8 characters long"}), 400
    
    success, message = auth.reset_password(token, new_password)
    
    if success:
        return jsonify({"message": message}), 200
    else:
        return jsonify({"error": message}), 400
