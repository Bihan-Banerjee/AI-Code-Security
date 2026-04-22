import secrets
import hashlib
import hmac
from datetime import datetime, timedelta, timezone
from flask import Flask, request, jsonify, render_template_string
from flask_sqlalchemy import SQLAlchemy
from werkzeug.security import generate_password_hash, check_password_hash
import bcrypt

app = Flask(__name__)
app.config['SECRET_KEY'] = secrets.token_hex(32)
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///users.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
db = SQLAlchemy(app)

# Database Models
class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(128), nullable=False)
    password_reset_token_hash = db.Column(db.String(64), nullable=True)
    password_reset_expires_at = db.Column(db.DateTime, nullable=True)
    
    def set_password(self, password):
        """Hash password using bcrypt"""
        self.password_hash = bcrypt.hashpw(
            password.encode('utf-8'), 
            bcrypt.gensalt()
        ).decode('utf-8')
    
    def check_password(self, password):
        """Verify password using bcrypt"""
        return bcrypt.checkpw(
            password.encode('utf-8'), 
            self.password_hash.encode('utf-8')
        )

# Helper functions
def generate_reset_token():
    """Generate cryptographically secure token"""
    return secrets.token_urlsafe(32)

def hash_token(token):
    """Hash token for storage"""
    return hashlib.sha256(token.encode('utf-8')).hexdigest()

def verify_token(stored_hash, provided_token):
    """Constant-time token comparison"""
    provided_hash = hash_token(provided_token)
    return hmac.compare_digest(stored_hash, provided_hash)

# Password Reset Request Endpoint
@app.route('/request-password-reset', methods=['POST'])
def request_password_reset():
    """
    (1) Generate token using secrets.token_urlsafe(32)
    (2) Store hash of token in database
    (3) Set expiry of 1 hour
    (4) Return same response whether email exists or not
    """
    data = request.get_json()
    email = data.get('email')
    
    # Always return same response to prevent user enumeration
    response_message = "If an account exists with this email, a password reset link has been sent."
    
    if not email:
        return jsonify({"error": "Email is required"}), 400
    
    # Find user by email
    user = User.query.filter_by(email=email).first()
    
    if user:
        # Generate token
        token = generate_reset_token()
        
        # Store hash of token (not raw token)
        token_hash = hash_token(token)
        
        # Set expiry (1 hour from now)
        expiry_time = datetime.now(timezone.utc) + timedelta(hours=1)
        
        # Update user record
        user.password_reset_token_hash = token_hash
        user.password_reset_expires_at = expiry_time
        
        db.session.commit()
        
        # In production, send email here
        # send_reset_email(email, token)
        print(f"Reset token for {email}: {token}")  # Debug only
        
    # Return same response regardless of email existence
    return jsonify({"message": response_message}), 200

# Password Reset Validation Endpoint
@app.route('/reset-password', methods=['POST'])
def reset_password():
    """
    Validation function:
    - Use constant-time comparison for token
    - Verify token hasn't expired
    - Re-hash new password using bcrypt
    - Invalidate token immediately after use
    """
    data = request.get_json()
    email = data.get('email')
    token = data.get('token')
    new_password = data.get('new_password')
    
    # Input validation
    if not all([email, token, new_password]):
        return jsonify({"error": "Email, token, and new password are required"}), 400
    
    if len(new_password) < 8:
        return jsonify({"error": "Password must be at least 8 characters"}), 400
    
    # Find user
    user = User.query.filter_by(email=email).first()
    
    # Early return if user doesn't exist (prevents timing attacks)
    if not user or not user.password_reset_token_hash:
        return jsonify({"error": "Invalid or expired reset token"}), 400
    
    # Check if token has expired
    current_time = datetime.now(timezone.utc)
    if user.password_reset_expires_at < current_time:
        # Clean up expired token
        user.password_reset_token_hash = None
        user.password_reset_expires_at = None
        db.session.commit()
        return jsonify({"error": "Reset token has expired"}), 400
    
    # Constant-time token comparison
    if not verify_token(user.password_reset_token_hash, token):
        return jsonify({"error": "Invalid reset token"}), 400
    
    # Token is valid - update password using bcrypt
    user.set_password(new_password)
    
    # Invalidate token immediately after successful use
    user.password_reset_token_hash = None
    user.password_reset_expires_at = None
    
    db.session.commit()
    
    return jsonify({"message": "Password has been reset successfully"}), 200

# Example HTML form (for testing)
@app.route('/reset-form/<token>')
def reset_form(token):
    """Simple HTML form for testing"""
    return render_template_string('''
        <form method="POST" action="/reset-password">
            <input type="hidden" name="token" value="{{ token }}">
            <input type="email" name="email" placeholder="Email" required><br>
            <input type="password" name="new_password" placeholder="New Password" required><br>
            <button type="submit">Reset Password</button>
        </form>
    ''', token=token)

# Initialize database
@app.before_first_request
def create_tables():
    db.create_all()

if __name__ == '__main__':
    app.run(debug=True)