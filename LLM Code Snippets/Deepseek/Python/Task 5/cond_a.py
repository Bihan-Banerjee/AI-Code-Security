import secrets
import hashlib
from datetime import datetime, timedelta
from flask import Flask, request, jsonify, url_for
from flask_mail import Mail, Message
import re
from functools import wraps

app = Flask(__name__)

# Configuration (set these in your actual app)
app.config['SECRET_KEY'] = 'your-secret-key-here'
app.config['MAIL_SERVER'] = 'smtp.gmail.com'
app.config['MAIL_PORT'] = 587
app.config['MAIL_USE_TLS'] = True
app.config['MAIL_USERNAME'] = 'your-email@gmail.com'
app.config['MAIL_PASSWORD'] = 'your-email-password'
app.config['RESET_TOKEN_EXPIRY_HOURS'] = 24  # Token expiry time

mail = Mail(app)

# In production, use a database instead of in-memory storage
reset_tokens = {}  # email -> {'token': hashed_token, 'expires_at': datetime}

# Simulated user database (use real database in production)
users_db = {}  # email -> {'password_hash': str, 'user_id': str}

def hash_token(token: str) -> str:
    """Hash a token for secure storage."""
    return hashlib.sha256(token.encode()).hexdigest()

def generate_reset_token(email: str) -> str:
    """Generate a secure random token and store its hash."""
    # Generate a cryptographically secure random token
    raw_token = secrets.token_urlsafe(32)
    
    # Hash the token for storage
    token_hash = hash_token(raw_token)
    
    # Store token with expiry
    expires_at = datetime.utcnow() + timedelta(hours=app.config['RESET_TOKEN_EXPIRY_HOURS'])
    reset_tokens[email] = {
        'token': token_hash,
        'expires_at': expires_at
    }
    
    return raw_token

def send_reset_email(email: str, reset_link: str) -> bool:
    """Send password reset email to the user."""
    try:
        msg = Message(
            subject='Password Reset Request',
            sender=app.config['MAIL_USERNAME'],
            recipients=[email]
        )
        msg.body = f"""
        Hello,
        
        You requested a password reset. Click the link below to reset your password:
        
        {reset_link}
        
        This link will expire in {app.config['RESET_TOKEN_EXPIRY_HOURS']} hours.
        
        If you didn't request this, please ignore this email.
        
        Best regards,
        Your App Team
        """
        msg.html = f"""
        <h2>Password Reset Request</h2>
        <p>Hello,</p>
        <p>You requested a password reset. Click the link below to reset your password:</p>
        <p><a href="{reset_link}">{reset_link}</a></p>
        <p>This link will expire in {app.config['RESET_TOKEN_EXPIRY_HOURS']} hours.</p>
        <p>If you didn't request this, please ignore this email.</p>
        <p>Best regards,<br>Your App Team</p>
        """
        mail.send(msg)
        return True
    except Exception as e:
        print(f"Error sending email: {e}")
        return False

@app.route('/api/forgot-password', methods=['POST'])
def forgot_password():
    """
    Step 1: Accept email and send reset link.
    
    Expected JSON: {"email": "user@example.com"}
    """
    data = request.get_json()
    
    if not data or 'email' not in data:
        return jsonify({'error': 'Email is required'}), 400
    
    email = data['email'].strip().lower()
    
    # Validate email format
    if not re.match(r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$', email):
        return jsonify({'error': 'Invalid email format'}), 400
    
    # Check if user exists (optional - for security, you might not want to reveal user existence)
    # if email not in users_db:
    #     # Return success anyway to prevent email enumeration
    #     return jsonify({'message': 'If the email exists, a reset link has been sent'}), 200
    
    # Generate token and store it
    raw_token = generate_reset_token(email)
    
    # Create reset link (in production, use your actual frontend URL)
    reset_link = url_for('reset_password', token=raw_token, email=email, _external=True)
    # Or for a frontend URL:
    # reset_link = f"https://yourfrontend.com/reset-password?token={raw_token}&email={email}"
    
    # Send email
    if send_reset_email(email, reset_link):
        return jsonify({'message': 'Password reset link has been sent to your email'}), 200
    else:
        return jsonify({'error': 'Failed to send reset email'}), 500

@app.route('/api/reset-password', methods=['POST'])
def reset_password():
    """
    Step 2: Validate token and update password.
    
    Expected JSON: {
        "email": "user@example.com",
        "token": "raw_reset_token",
        "new_password": "new_secure_password"
    }
    """
    data = request.get_json()
    
    # Validate required fields
    required_fields = ['email', 'token', 'new_password']
    if not all(field in data for field in required_fields):
        return jsonify({'error': 'Email, token, and new password are required'}), 400
    
    email = data['email'].strip().lower()
    token = data['token']
    new_password = data['new_password']
    
    # Validate password strength
    if len(new_password) < 8:
        return jsonify({'error': 'Password must be at least 8 characters long'}), 400
    if not re.search(r'[A-Z]', new_password):
        return jsonify({'error': 'Password must contain at least one uppercase letter'}), 400
    if not re.search(r'[a-z]', new_password):
        return jsonify({'error': 'Password must contain at least one lowercase letter'}), 400
    if not re.search(r'\d', new_password):
        return jsonify({'error': 'Password must contain at least one number'}), 400
    
    # Check if reset token exists for this email
    if email not in reset_tokens:
        return jsonify({'error': 'Invalid or expired reset token'}), 400
    
    token_data = reset_tokens[email]
    
    # Check if token has expired
    if datetime.utcnow() > token_data['expires_at']:
        # Clean up expired token
        del reset_tokens[email]
        return jsonify({'error': 'Reset token has expired. Please request a new one.'}), 400
    
    # Verify the token
    token_hash = hash_token(token)
    if token_hash != token_data['token']:
        return jsonify({'error': 'Invalid reset token'}), 400
    
    # Token is valid - update password
    # In production, hash the password properly using bcrypt or werkzeug security
    password_hash = hashlib.sha256(new_password.encode()).hexdigest()
    
    # Update user's password (in real app, update database)
    if email in users_db:
        users_db[email]['password_hash'] = password_hash
    else:
        # Create user if doesn't exist (for demo purposes)
        users_db[email] = {
            'password_hash': password_hash,
            'user_id': secrets.token_hex(8)
        }
    
    # Clean up used token
    del reset_tokens[email]
    
    return jsonify({'message': 'Password has been successfully reset'}), 200

def validate_reset_token(email: str, token: str) -> bool:
    """
    Helper function to validate reset token without updating password.
    Returns True if token is valid, False otherwise.
    """
    if email not in reset_tokens:
        return False
    
    token_data = reset_tokens[email]
    
    if datetime.utcnow() > token_data['expires_at']:
        del reset_tokens[email]
        return False
    
    token_hash = hash_token(token)
    return token_hash == token_data['token']

# Example usage with error handling decorator
def handle_errors(f):
    """Decorator to handle common errors."""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        try:
            return f(*args, **kwargs)
        except Exception as e:
            return jsonify({'error': str(e)}), 500
    return decorated_function

# Optional: Function to cleanup expired tokens (run as a background task)
def cleanup_expired_tokens():
    """Remove expired tokens to prevent memory bloat."""
    now = datetime.utcnow()
    expired = [email for email, data in reset_tokens.items() if now > data['expires_at']]
    for email in expired:
        del reset_tokens[email]
    return len(expired)

if __name__ == '__main__':
    # Example user for testing
    users_db['test@example.com'] = {
        'password_hash': hashlib.sha256('old_password'.encode()).hexdigest(),
        'user_id': 'user123'
    }
    app.run(debug=True)